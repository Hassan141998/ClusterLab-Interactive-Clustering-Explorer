"""
Shared utilities for ClusterLab Vercel Python Functions.
Imported by every handler in the api/ directory.
"""
import os
import json
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_iris, make_blobs, make_moons, make_circles
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import dendrogram, linkage
import psycopg2
import psycopg2.extras
import warnings
warnings.filterwarnings("ignore")


# ── CORS headers returned by every function ──────────────────────────────────
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
}

def cors_response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }

def options_response() -> dict:
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}


# ── Neon DB ───────────────────────────────────────────────────────────────────
def get_conn():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return None
    conn = psycopg2.connect(url, sslmode="require")
    return conn

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


# ── Dataset loaders ───────────────────────────────────────────────────────────
def load_dataset(name: str, csv_text: str | None = None) -> pd.DataFrame:
    import io
    if name == "csv" and csv_text:
        df = pd.read_csv(io.StringIO(csv_text))
        num = df.select_dtypes(include=[np.number]).columns.tolist()
        return df[num]
    elif name == "iris":
        d = load_iris()
        return pd.DataFrame(d.data, columns=d.feature_names)
    elif name == "blobs":
        X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.8, random_state=42)
        return pd.DataFrame(X, columns=["feature_1", "feature_2"])
    elif name == "moons":
        X, _ = make_moons(n_samples=300, noise=0.1, random_state=42)
        return pd.DataFrame(X, columns=["feature_1", "feature_2"])
    elif name == "circles":
        X, _ = make_circles(n_samples=300, noise=0.05, factor=0.5, random_state=42)
        return pd.DataFrame(X, columns=["feature_1", "feature_2"])
    elif name == "mall":
        np.random.seed(42)
        data = {
            "annual_income": np.concatenate([
                np.random.normal(20, 5, 40), np.random.normal(60, 10, 60),
                np.random.normal(85, 5, 40), np.random.normal(25, 5, 35),
                np.random.normal(60, 8, 25),
            ]),
            "spending_score": np.concatenate([
                np.random.normal(75, 8, 40), np.random.normal(55, 10, 60),
                np.random.normal(80, 8, 40), np.random.normal(25, 8, 35),
                np.random.normal(20, 8, 25),
            ]),
        }
        return pd.DataFrame(data)
    elif name == "wholesale":
        np.random.seed(99)
        n = 250
        return pd.DataFrame({
            "fresh":   np.abs(np.random.normal(12000, 12000, n)),
            "milk":    np.abs(np.random.normal(5800,  7000,  n)),
            "grocery": np.abs(np.random.normal(7950,  9000,  n)),
            "frozen":  np.abs(np.random.normal(3075,  5000,  n)),
        })
    else:
        raise ValueError(f"Unknown dataset: {name}")


def reduce_to_2d(X: np.ndarray) -> np.ndarray:
    if X.shape[1] > 2:
        return PCA(n_components=2, random_state=42).fit_transform(X)
    return X


def compute_metrics(X: np.ndarray, labels: np.ndarray) -> dict:
    unique = np.unique(labels[labels != -1])
    n_clusters = int(len(unique))
    base = {"n_clusters_found": n_clusters, "noise_points": int((labels == -1).sum())}

    if n_clusters < 2:
        return {**base, "silhouette_score": None, "db_score": None, "ch_score": None}

    mask = labels != -1
    Xv, Lv = X[mask], labels[mask]
    if len(np.unique(Lv)) < 2:
        return {**base, "silhouette_score": None, "db_score": None, "ch_score": None}

    try:
        sil = round(float(silhouette_score(Xv, Lv)), 4)
        db  = round(float(davies_bouldin_score(Xv, Lv)), 4)
        ch  = round(float(calinski_harabasz_score(Xv, Lv)), 2)
    except Exception:
        sil = db = ch = None

    return {**base, "silhouette_score": sil, "db_score": db, "ch_score": ch}


def run_clustering(dataset: str, algorithm: str, params: dict, csv_data: str | None = None) -> dict:
    df = load_dataset(dataset, csv_data)
    X_raw = df.values.astype(float)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)
    X_2d = reduce_to_2d(X)

    algo = algorithm.lower()
    extra = {}

    if algo == "kmeans":
        n_clusters = int(params.get("n_clusters", 3))
        init       = params.get("init", "k-means++")
        max_iter   = int(params.get("max_iter", 300))
        model = KMeans(n_clusters=n_clusters, init=init, max_iter=max_iter,
                       n_init=10, random_state=42)
        labels = model.fit_predict(X)

        # Centers projected to 2D
        centers_raw = scaler.inverse_transform(model.cluster_centers_)
        centers_2d  = reduce_to_2d(centers_raw) if centers_raw.shape[1] > 2 else centers_raw
        extra["cluster_centers_2d"] = centers_2d.tolist()

        # Elbow
        ks = list(range(2, min(11, len(X) // 5 + 2)))
        inertias, sil_scores = [], []
        for k in ks:
            km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
            inertias.append(float(km.inertia_))
            try:
                sil_scores.append(float(silhouette_score(X, km.labels_)))
            except Exception:
                sil_scores.append(0.0)
        best_k = ks[int(np.argmax(sil_scores))] if sil_scores else n_clusters
        extra["elbow"] = {"k": ks, "inertia": inertias, "silhouette": sil_scores, "best_k": best_k}

    elif algo == "dbscan":
        eps         = float(params.get("eps", 0.5))
        min_samples = int(params.get("min_samples", 5))
        model  = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(X)
        extra["core_sample_indices"] = model.core_sample_indices_.tolist()[:200]

    elif algo == "hierarchical":
        n_clusters = int(params.get("n_clusters", 3))
        link_method = params.get("linkage", "ward")
        model  = AgglomerativeClustering(n_clusters=n_clusters, linkage=link_method)
        labels = model.fit_predict(X)

        # Dendrogram (sample 100 pts)
        idx = np.random.choice(len(X), min(100, len(X)), replace=False)
        Z   = linkage(X[idx], method=link_method)
        try:
            dend = dendrogram(Z, no_plot=True)
            extra["dendrogram"] = {
                "icoord": dend["icoord"],
                "dcoord": dend["dcoord"],
                "leaves": dend["leaves"],
                "color_list": dend["color_list"],
            }
        except Exception as e:
            extra["dendrogram"] = {"error": str(e)}
    else:
        raise ValueError(f"Unknown algorithm: {algo}")

    metrics = compute_metrics(X, labels)

    return {
        "cluster_labels": labels.tolist(),
        "metrics":        metrics,
        "plot_data": {
            "x":             X_2d[:, 0].tolist(),
            "y":             X_2d[:, 1].tolist(),
            "labels":        labels.tolist(),
            "feature_names": df.columns.tolist()[:2],
            "n_points":      int(len(X_2d)),
        },
        "silhouette_score": metrics.get("silhouette_score"),
        "extra":            extra,
        "dataset_info": {
            "n_samples":  int(len(X)),
            "n_features": int(df.shape[1]),
            "columns":    df.columns.tolist(),
        },
    }
