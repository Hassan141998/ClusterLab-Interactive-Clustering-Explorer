# 🔬 ClusterLab — Interactive Clustering Explorer

> **100% free hosting** — Vercel (frontend + Python API) + Neon (PostgreSQL). No Railway, no Render, no paid tiers.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/clusterlab)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                  VERCEL (free)                   │
│                                                  │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │  Next.js 14 App  │   │  Python Serverless   │  │
│  │  (frontend/)     │◄──│  Functions (api/)    │  │
│  │                  │   │                      │  │
│  │  • Scatter Plot  │   │  api/cluster/        │  │
│  │  • Elbow Chart   │   │  api/experiments/    │  │
│  │  • Dendrogram    │   │  api/csv-upload.py   │  │
│  │  • Compare View  │   │  api/datasets.py     │  │
│  │  • Exp History   │   │  api/health.py       │  │
│  └─────────────────┘   └──────────┬───────────┘  │
└────────────────────────────────────┼────────────┘
                                     │ psycopg2
                              ┌──────▼──────┐
                              │  Neon (free) │
                              │  PostgreSQL  │
                              │  experiments │
                              │  table       │
                              └─────────────┘
```

**No separate backend server.** The Python ML functions (scikit-learn, scipy) run as Vercel Serverless Functions on the same domain as the Next.js app — calls go to `/api/...`.

---

## ✨ Features

| Feature | Details |
|---|---|
| **3 Algorithms** | K-Means, DBSCAN, Agglomerative Hierarchical |
| **6 Built-in Datasets** | Iris, Blobs, Moons, Circles, Mall Customers, Wholesale |
| **CSV Upload** | Drag & drop any CSV with ≥2 numeric columns |
| **Live Parameter Sliders** | Terminal-style param panels per algorithm |
| **Interactive Scatter** | Plotly 2D, color-coded clusters, zoom/pan/hover |
| **Elbow Method Chart** | Dual-axis: inertia + silhouette, auto-suggests optimal K |
| **Dendrogram** | Scipy linkage tree with cut-line at chosen K |
| **3-Way Compare** | Run all 3 algorithms simultaneously, side-by-side |
| **3 Live Metrics** | Silhouette, Davies-Bouldin, Calinski-Harabasz with quality badges |
| **Experiment History** | Save/reload/delete/export from Neon DB |
| **DBSCAN Diagnostics** | Core points, noise point count, cluster count |

---

## 📁 Project Structure

```
clusterlab/
├── api/                        ← Python Serverless Functions (Vercel)
│   ├── _utils.py               ← Shared: DB, ML, CORS helpers
│   ├── health.py               ← GET  /api/health
│   ├── datasets.py             ← GET  /api/datasets
│   ├── csv-upload.py           ← POST /api/csv-upload
│   ├── cluster/
│   │   ├── index.py            ← POST /api/cluster
│   │   └── compare.py          ← POST /api/cluster/compare
│   └── experiments/
│       ├── index.py            ← GET  /api/experiments
│       ├── save.py             ← POST /api/experiments/save
│       └── delete.py           ← DELETE /api/experiments/delete?id=N
├── frontend/                   ← Next.js 14 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        ← Main app (tabs, layout, all state)
│   │   │   ├── layout.tsx      ← Root layout
│   │   │   └── globals.css     ← Theme, animations, scrollbars
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── DatasetSelector.tsx
│   │   │   ├── AlgorithmParams.tsx
│   │   │   ├── ScatterPlot.tsx
│   │   │   ├── MetricsPanel.tsx
│   │   │   ├── ElbowChart.tsx
│   │   │   ├── Dendrogram.tsx
│   │   │   ├── CompareView.tsx
│   │   │   └── ExperimentHistory.tsx
│   │   ├── lib/
│   │   │   ├── api.ts          ← Axios API client (same-origin /api/...)
│   │   │   └── colors.ts       ← Cluster colors + score quality helpers
│   │   └── types/index.ts      ← Full TypeScript types
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                    ← FastAPI dev server (local only)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── requirements.txt            ← Python deps for Vercel functions
├── vercel.json                 ← Vercel routing + function config
└── README.md
```

---

## 🚀 Deploy (Vercel + Neon — both FREE)

### Step 1 — Neon PostgreSQL

1. Go to **[neon.tech](https://neon.tech)** → Sign up free → **New Project**
2. Choose region closest to you
3. Copy the **Connection String**: `postgresql://user:pass@host/dbname?sslmode=require`
4. Save it — you'll paste it into Vercel

> Tables are **auto-created** on first request. Nothing to run manually.

---

### Step 2 — Push to GitHub

```bash
# From the clusterlab/ root directory:

git init
git add .
git commit -m "feat: ClusterLab v2 — Vercel + Neon, no separate backend"

# Create a repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/clusterlab.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# From clusterlab/ root:
vercel

# Answer the prompts:
#   Set up and deploy? → Y
#   Which scope?       → your account
#   Link to existing?  → N
#   Project name?      → clusterlab
#   Directory?         → ./   (root)
#   Override settings? → N
```

Then add your Neon URL as a secret:

```bash
vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

# Deploy to production
vercel --prod
```

**That's it.** Your app is live at `https://clusterlab-xxx.vercel.app` 🎉

---

### Step 4 — Verify

```bash
# Health check
curl https://your-app.vercel.app/api/health
# → {"status":"ok","version":"2.0.0","db":"connected"}

# List datasets
curl https://your-app.vercel.app/api/datasets

# Run K-Means
curl -X POST https://your-app.vercel.app/api/cluster \
  -H "Content-Type: application/json" \
  -d '{"dataset":"iris","algorithm":"kmeans","params":{"n_clusters":3}}'
```

---

## 💻 Local Development

You can use **either** the Vercel Python functions OR the FastAPI dev server locally.

### Option A — Vercel dev (recommended, matches production exactly)

```bash
npm i -g vercel

# From clusterlab/ root:
cp frontend/.env.local.example frontend/.env.local
# Leave NEXT_PUBLIC_API_URL empty (same-origin routing)

vercel dev
# → http://localhost:3000  (frontend + API functions together)
```

### Option B — FastAPI dev server + Next.js separately

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: DATABASE_URL=postgresql://...
python main.py
# → http://localhost:8000  (FastAPI + Swagger at /docs)

# Terminal 2 — Frontend
cd frontend
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev
# → http://localhost:3000
```

---

## 🗄 Database Schema

Auto-created in Neon on first request:

```sql
CREATE TABLE experiments (
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
);
```

---

## 🔌 API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET`    | `/api/health`                  | Health + DB status |
| `GET`    | `/api/datasets`                | List built-in datasets |
| `POST`   | `/api/csv-upload`              | Upload & parse CSV |
| `POST`   | `/api/cluster`                 | Run single algorithm |
| `POST`   | `/api/cluster/compare`         | Run all 3 algorithms |
| `GET`    | `/api/experiments`             | List experiment history |
| `POST`   | `/api/experiments/save`        | Save experiment to Neon |
| `DELETE` | `/api/experiments/delete?id=N` | Delete experiment |

### POST /api/cluster — Request body

```json
{
  "dataset":   "iris",
  "algorithm": "kmeans",
  "params":    { "n_clusters": 3, "init": "k-means++", "max_iter": 300 },
  "csv_data":  null
}
```

### POST /api/cluster — Response

```json
{
  "cluster_labels": [0, 1, 2, 1, 0, ...],
  "metrics": {
    "n_clusters_found": 3,
    "silhouette_score": 0.5528,
    "db_score":         0.6612,
    "ch_score":         561.63,
    "noise_points":     0
  },
  "plot_data": {
    "x": [...], "y": [...], "labels": [...],
    "feature_names": ["sepal length (cm)", "sepal width (cm)"],
    "n_points": 150
  },
  "silhouette_score": 0.5528,
  "extra": {
    "elbow": { "k": [2,3,4,...], "inertia": [...], "silhouette": [...], "best_k": 3 },
    "cluster_centers_2d": [[x0,y0], [x1,y1], [x2,y2]]
  },
  "dataset_info": { "n_samples": 150, "n_features": 4, "columns": [...] }
}
```

---

## 🎨 Design Tokens

| Token         | Value      | Use                     |
|---------------|------------|-------------------------|
| `bg`          | `#0d0d0d`  | Page background         |
| `surface`     | `#141414`  | Cards / panels          |
| `purple`      | `#7c3aed`  | Primary accent          |
| `purple-light`| `#a855f7`  | Labels / hover          |
| `neon`        | `#39ff14`  | Good scores / success   |
| Font UI       | Space Grotesk  | All interface text  |
| Font Mono     | Roboto Mono    | Params / metrics    |

---

## 📦 Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS          |
| Charts     | Plotly.js (scatter, elbow, dendrogram)        |
| ML         | scikit-learn, scipy, numpy, pandas            |
| Database   | Neon PostgreSQL (psycopg2-binary)             |
| Hosting    | Vercel (frontend + Python serverless functions)|
| Local dev  | FastAPI + uvicorn (optional)                  |

---

## 📄 License

MIT
