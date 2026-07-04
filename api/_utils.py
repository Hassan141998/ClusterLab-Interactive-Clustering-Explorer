import os, json, io
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_iris, make_blobs, make_moons, make_circles
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import dendrogram, linkage
import warnings
warnings.filterwarnings("ignore")

try:
    import psycopg2, psycopg2.extras
    _PG = True
except ImportError:
    _PG = False

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

def ok(body, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, default=str)}

def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg})}

def opts():
    return {"statusCode": 200, "headers": CORS, "body": ""}

def parse_body(request):
    try:
        raw = request.body
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")
        return json.loads(raw) if raw else {}
    except Exception:
        return {}

def get_conn():
    if not _PG:
        return None
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return None
    try:
        return psycopg2.connect(url, sslmode="require")
    except Exception:
        return None

def ensure_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                id               SERIAL PRIMARY KEY,
                algorithm        VARCHAR(50)  NOT NULL,
                dataset_name     VARCHAR(100) NOT NULL,
                params_json      JSONB        NOT NULL,
                silhouette_score FLOAT,
                db_score         FLOAT,
                ch_score         FLOAT,
                n_clusters_found INTEGER,
                plot_data        JSONB,
                metrics_json     JSONB,
                created_at       TIMESTAMPTZ  DEFAULT NOW()
            )
        """)
    conn.commit()

def load_dataset(name, csv_text=None):
    if name == "csv" and csv_text:
        df = pd.read_csv(io.StringIO(csv_text))
        return df[df.select_dtypes(include=[np.number]).columns.tolist()]
    elif name == "iris":
        d = load_iris(); return pd.DataFrame(d.data, columns=d.feature_names)
    elif name == "blobs":
        X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.8, random_state=42)
        return pd.DataFrame(X, columns=["feature_1","feature_2"])
    elif name == "moons":
        X, _ = make_moons(n_samples=300, noise=0.1, random_state=42)
        return pd.DataFrame(X, columns=["feature_1","feature_2"])
    elif name == "circles":
        X, _ = make_circles(n_samples=300, noise=0.05, factor=0.5, random_state=42)
        return pd.DataFrame(X, columns=["feature_1","feature_2"])
    elif name == "mall":
        np.random.seed(42)
        return pd.DataFrame({
            "annual_income":  np.concatenate([np.random.normal(20,5,40),np.random.normal(60,10,60),np.random.normal(85,5,40),np.random.normal(25,5,35),np.random.normal(60,8,25)]),
            "spending_score": np.concatenate([np.random.normal(75,8,40),np.random.normal(55,10,60),np.random.normal(80,8,40),np.random.normal(25,8,35),np.random.normal(20,8,25)]),
        })
    elif name == "wholesale":
        np.random.seed(99); n=250
        return pd.DataFrame({"fresh":np.abs(np.random.normal(12000,12000,n)),"milk":np.abs(np.random.normal(5800,7000,n)),"grocery":np.abs(np.random.normal(7950,9000,n)),"frozen":np.abs(np.random.normal(3075,5000,n))})
    else:
        raise ValueError(f"Unknown dataset: {name}")

def reduce_to_2d(X):
    return PCA(n_components=2, random_state=42).fit_transform(X) if X.shape[1] > 2 else X

def compute_metrics(X, labels):
    unique = np.unique(labels[labels != -1])
    n = int(len(unique))
    base = {"n_clusters_found": n, "noise_points": int((labels==-1).sum())}
    if n < 2: return {**base, "silhouette_score": None, "db_score": None, "ch_score": None}
    mask = labels != -1
    Xv, Lv = X[mask], labels[mask]
    if len(np.unique(Lv)) < 2: return {**base, "silhouette_score": None, "db_score": None, "ch_score": None}
    try:
        return {**base,
            "silhouette_score": round(float(silhouette_score(Xv,Lv)),4),
            "db_score": round(float(davies_bouldin_score(Xv,Lv)),4),
            "ch_score": round(float(calinski_harabasz_score(Xv,Lv)),2)}
    except:
        return {**base, "silhouette_score": None, "db_score": None, "ch_score": None}

def run_clustering(dataset, algorithm, params, csv_data=None):
    df = load_dataset(dataset, csv_data)
    X = StandardScaler().fit_transform(df.values.astype(float))
    X_2d = reduce_to_2d(X)
    algo = algorithm.lower()
    extra = {}

    if algo == "kmeans":
        n_clusters = int(params.get("n_clusters",3))
        scaler = StandardScaler().fit(df.values.astype(float))
        X_scaled = scaler.transform(df.values.astype(float))
        model = KMeans(n_clusters=n_clusters, init=params.get("init","k-means++"), max_iter=int(params.get("max_iter",300)), n_init=10, random_state=42)
        labels = model.fit_predict(X_scaled)
        X_2d = reduce_to_2d(X_scaled)
        centers_raw = scaler.inverse_transform(model.cluster_centers_)
        extra["cluster_centers_2d"] = (reduce_to_2d(centers_raw) if centers_raw.shape[1]>2 else centers_raw).tolist()
        ks = list(range(2, min(11, len(X_scaled)//5+2)))
        inertias, sils = [], []
        for k in ks:
            km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X_scaled)
            inertias.append(float(km.inertia_))
            try: sils.append(float(silhouette_score(X_scaled, km.labels_)))
            except: sils.append(0.0)
        extra["elbow"] = {"k":ks,"inertia":inertias,"silhouette":sils,"best_k":ks[int(np.argmax(sils))] if sils else n_clusters}
        X = X_scaled

    elif algo == "dbscan":
        model = DBSCAN(eps=float(params.get("eps",0.5)), min_samples=int(params.get("min_samples",5)))
        labels = model.fit_predict(X)
        extra["core_sample_indices"] = model.core_sample_indices_.tolist()[:200]

    elif algo == "hierarchical":
        n_clusters = int(params.get("n_clusters",3))
        lm = params.get("linkage","ward")
        labels = AgglomerativeClustering(n_clusters=n_clusters, linkage=lm).fit_predict(X)
        idx = np.random.choice(len(X), min(100,len(X)), replace=False)
        try:
            dend = dendrogram(linkage(X[idx], method=lm), no_plot=True)
            extra["dendrogram"] = {"icoord":dend["icoord"],"dcoord":dend["dcoord"],"leaves":dend["leaves"],"color_list":dend["color_list"]}
        except Exception as e:
            extra["dendrogram"] = {"error": str(e)}
    else:
        raise ValueError(f"Unknown algorithm: {algo}")

    metrics = compute_metrics(X, labels)
    return {
        "cluster_labels": labels.tolist(),
        "metrics": metrics,
        "plot_data": {"x":X_2d[:,0].tolist(),"y":X_2d[:,1].tolist(),"labels":labels.tolist(),"feature_names":df.columns.tolist()[:2],"n_points":int(len(X_2d))},
        "silhouette_score": metrics.get("silhouette_score"),
        "extra": extra,
        "dataset_info": {"n_samples":int(len(X)),"n_features":int(df.shape[1]),"columns":df.columns.tolist()},
    }
