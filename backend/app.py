"""
Hugging Face Spaces entry point.
HF Spaces runs: uvicorn app:app --host 0.0.0.0 --port 7860
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_iris, make_blobs, make_moons, make_circles
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import dendrogram, linkage
import io, json, os
from typing import Optional, Dict, Any
from pydantic import BaseModel
import warnings
warnings.filterwarnings('ignore')

try:
    import psycopg2, psycopg2.extras
    _PG = True
except ImportError:
    _PG = False

def get_conn():
    if not _PG: return None
    url = os.environ.get("DATABASE_URL", "")
    if not url: return None
    try: return psycopg2.connect(url, sslmode="require")
    except: return None

def ensure_table(conn):
    try:
        with conn.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS experiments (
                id SERIAL PRIMARY KEY, algorithm VARCHAR(50) NOT NULL,
                dataset_name VARCHAR(100) NOT NULL, params_json JSONB NOT NULL,
                silhouette_score FLOAT, db_score FLOAT, ch_score FLOAT,
                n_clusters_found INTEGER, plot_data JSONB, metrics_json JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW())""")
        conn.commit()
    except: pass

app = FastAPI(title="ClusterLab API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

class ClusterRequest(BaseModel):
    dataset: str
    algorithm: str
    params: Dict[str, Any]
    csv_data: Optional[str] = None

class SaveExperimentRequest(BaseModel):
    algorithm: str
    dataset_name: str
    params_json: Dict[str, Any]
    silhouette_score: Optional[float] = None
    db_score: Optional[float] = None
    ch_score: Optional[float] = None
    n_clusters_found: Optional[int] = None
    plot_data: Optional[Dict] = None
    metrics_json: Optional[Dict] = None

def load_dataset(name, csv_text=None):
    if name == "csv" and csv_text:
        df = pd.read_csv(io.StringIO(csv_text))
        return df[df.select_dtypes(include=[np.number]).columns.tolist()]
    elif name == "iris":
        d = load_iris(); return pd.DataFrame(d.data, columns=d.feature_names)
    elif name == "blobs":
        X,_ = make_blobs(n_samples=300,centers=4,cluster_std=0.8,random_state=42)
        return pd.DataFrame(X,columns=["feature_1","feature_2"])
    elif name == "moons":
        X,_ = make_moons(n_samples=300,noise=0.1,random_state=42)
        return pd.DataFrame(X,columns=["feature_1","feature_2"])
    elif name == "circles":
        X,_ = make_circles(n_samples=300,noise=0.05,factor=0.5,random_state=42)
        return pd.DataFrame(X,columns=["feature_1","feature_2"])
    elif name == "mall":
        np.random.seed(42)
        return pd.DataFrame({
            "annual_income": np.concatenate([np.random.normal(20,5,40),np.random.normal(60,10,60),np.random.normal(85,5,40),np.random.normal(25,5,35),np.random.normal(60,8,25)]),
            "spending_score": np.concatenate([np.random.normal(75,8,40),np.random.normal(55,10,60),np.random.normal(80,8,40),np.random.normal(25,8,35),np.random.normal(20,8,25)]),
        })
    elif name == "wholesale":
        np.random.seed(99); n=250
        return pd.DataFrame({"fresh":np.abs(np.random.normal(12000,12000,n)),"milk":np.abs(np.random.normal(5800,7000,n)),"grocery":np.abs(np.random.normal(7950,9000,n)),"frozen":np.abs(np.random.normal(3075,5000,n))})
    raise HTTPException(400, f"Unknown dataset: {name}")

def reduce_to_2d(X):
    return PCA(n_components=2,random_state=42).fit_transform(X) if X.shape[1]>2 else X

def compute_metrics(X, labels):
    unique = np.unique(labels[labels!=-1]); n=int(len(unique))
    base = {"n_clusters_found":n,"noise_points":int((labels==-1).sum())}
    if n<2: return {**base,"silhouette_score":None,"db_score":None,"ch_score":None}
    mask=labels!=-1; Xv,Lv=X[mask],labels[mask]
    if len(np.unique(Lv))<2: return {**base,"silhouette_score":None,"db_score":None,"ch_score":None}
    try:
        return {**base,
            "silhouette_score":round(float(silhouette_score(Xv,Lv)),4),
            "db_score":round(float(davies_bouldin_score(Xv,Lv)),4),
            "ch_score":round(float(calinski_harabasz_score(Xv,Lv)),2)}
    except:
        return {**base,"silhouette_score":None,"db_score":None,"ch_score":None}

@app.get("/health")
def health():
    conn=get_conn(); db="not_configured"
    if conn:
        try: conn.close(); db="connected"
        except: db="error"
    return {"status":"ok","version":"2.0.0","db":db}

@app.get("/api/datasets")
def list_datasets():
    return {"datasets":[
        {"id":"iris","name":"Iris","description":"Classic 4-feature flower dataset","n_samples":150,"n_features":4},
        {"id":"blobs","name":"Blobs","description":"Well-separated Gaussian clusters","n_samples":300,"n_features":2},
        {"id":"moons","name":"Moons","description":"Two interleaving half-circles","n_samples":300,"n_features":2},
        {"id":"circles","name":"Circles","description":"Concentric circle rings","n_samples":300,"n_features":2},
        {"id":"mall","name":"Mall Customers","description":"Income vs spending score","n_samples":200,"n_features":2},
        {"id":"wholesale","name":"Wholesale","description":"Product category spending (4D)","n_samples":250,"n_features":4},
    ]}

@app.post("/api/cluster")
def cluster(req: ClusterRequest):
    df=load_dataset(req.dataset,req.csv_data)
    scaler=StandardScaler(); X=scaler.fit_transform(df.values.astype(float))
    X_2d=reduce_to_2d(X); p=req.params; algo=req.algorithm.lower(); extra={}
    if algo=="kmeans":
        n=int(p.get("n_clusters",3))
        model=KMeans(n_clusters=n,init=p.get("init","k-means++"),max_iter=int(p.get("max_iter",300)),n_init=10,random_state=42)
        labels=model.fit_predict(X)
        c=scaler.inverse_transform(model.cluster_centers_)
        extra["cluster_centers_2d"]=(reduce_to_2d(c) if c.shape[1]>2 else c).tolist()
        ks=list(range(2,min(11,len(X)//5+2))); ins,ss=[],[]
        for k in ks:
            km=KMeans(n_clusters=k,n_init=10,random_state=42).fit(X)
            ins.append(float(km.inertia_))
            try: ss.append(float(silhouette_score(X,km.labels_)))
            except: ss.append(0.0)
        extra["elbow"]={"k":ks,"inertia":ins,"silhouette":ss,"best_k":ks[int(np.argmax(ss))] if ss else n}
    elif algo=="dbscan":
        model=DBSCAN(eps=float(p.get("eps",0.5)),min_samples=int(p.get("min_samples",5)))
        labels=model.fit_predict(X); extra["core_sample_indices"]=model.core_sample_indices_.tolist()[:200]
    elif algo=="hierarchical":
        n=int(p.get("n_clusters",3)); lm=p.get("linkage","ward")
        labels=AgglomerativeClustering(n_clusters=n,linkage=lm).fit_predict(X)
        idx=np.random.choice(len(X),min(100,len(X)),replace=False)
        try:
            dend=dendrogram(linkage(X[idx],method=lm),no_plot=True)
            extra["dendrogram"]={"icoord":dend["icoord"],"dcoord":dend["dcoord"],"leaves":dend["leaves"],"color_list":dend["color_list"]}
        except Exception as e: extra["dendrogram"]={"error":str(e)}
    else: raise HTTPException(400,f"Unknown algorithm: {algo}")
    metrics=compute_metrics(X,labels)
    return {"cluster_labels":labels.tolist(),"metrics":metrics,
            "plot_data":{"x":X_2d[:,0].tolist(),"y":X_2d[:,1].tolist(),"labels":labels.tolist(),"feature_names":df.columns.tolist()[:2],"n_points":int(len(X_2d))},
            "silhouette_score":metrics.get("silhouette_score"),"extra":extra,
            "dataset_info":{"n_samples":int(len(X)),"n_features":int(df.shape[1]),"columns":df.columns.tolist()}}

@app.post("/api/cluster/compare")
def compare_all(req: ClusterRequest):
    DEFAULTS={"kmeans":{"n_clusters":3,"init":"k-means++","max_iter":300},"dbscan":{"eps":0.5,"min_samples":5},"hierarchical":{"n_clusters":3,"linkage":"ward"}}
    results={}
    for algo,dp in DEFAULTS.items():
        try: results[algo]=cluster(ClusterRequest(dataset=req.dataset,algorithm=algo,params=dp,csv_data=req.csv_data))
        except Exception as e: results[algo]={"error":str(e)}
    return results

@app.post("/api/csv-upload")
async def upload_csv(file: UploadFile=File(...)):
    content=await file.read(); text=content.decode("utf-8")
    df=pd.read_csv(io.StringIO(text)); num=df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num)<2: raise HTTPException(400,"CSV must have at least 2 numeric columns")
    return {"csv_data":text,"columns":num,"n_rows":int(len(df)),"preview":df[num].head(5).fillna(0).to_dict(orient="records")}

@app.get("/api/experiments")
def get_experiments():
    conn=get_conn()
    if not conn: return {"experiments":[],"message":"DB not configured"}
    try:
        ensure_table(conn)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id,algorithm,dataset_name,params_json,silhouette_score,db_score,ch_score,n_clusters_found,metrics_json,created_at FROM experiments ORDER BY created_at DESC LIMIT 50")
            rows=[dict(r) for r in cur.fetchall()]
        conn.close()
        for r in rows:
            if r.get("created_at"): r["created_at"]=r["created_at"].isoformat()
        return {"experiments":rows}
    except Exception as e: conn.close(); raise HTTPException(500,str(e))

@app.post("/api/experiments/save")
def save_experiment(req: SaveExperimentRequest):
    conn=get_conn()
    if not conn: return {"id":None,"message":"DB not configured"}
    try:
        ensure_table(conn)
        with conn.cursor() as cur:
            cur.execute("INSERT INTO experiments (algorithm,dataset_name,params_json,silhouette_score,db_score,ch_score,n_clusters_found,plot_data,metrics_json) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,created_at",
                (req.algorithm,req.dataset_name,json.dumps(req.params_json),req.silhouette_score,req.db_score,req.ch_score,req.n_clusters_found,
                 json.dumps(req.plot_data) if req.plot_data else None,json.dumps(req.metrics_json) if req.metrics_json else None))
            row=cur.fetchone()
        conn.commit(); conn.close()
        return {"id":row[0],"created_at":row[1].isoformat(),"message":"Saved successfully"}
    except Exception as e: conn.close(); raise HTTPException(500,str(e))

@app.delete("/api/experiments/{exp_id}")
def delete_experiment(exp_id: int):
    conn=get_conn()
    if not conn: raise HTTPException(503,"DB not configured")
    try:
        with conn.cursor() as cur: cur.execute("DELETE FROM experiments WHERE id=%s",(exp_id,))
        conn.commit(); conn.close(); return {"deleted":exp_id}
    except Exception as e: conn.close(); raise HTTPException(500,str(e))
