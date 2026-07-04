"""
Vercel Python Serverless Function
Route: GET  /api/experiments        → list saved experiments
       POST /api/experiments/save   → save a new experiment
Backed by Neon PostgreSQL (psycopg2).
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _utils import cors_response, options_response, get_conn, ensure_table


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    # ── GET: list experiments ────────────────────────────────────────────────
    if request.method == "GET":
        conn = get_conn()
        if conn is None:
            return cors_response(200, {"experiments": [], "message": "DB not configured"})
        try:
            ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, algorithm, dataset_name, params_json,
                           silhouette_score, db_score, ch_score,
                           n_clusters_found, metrics_json, created_at
                    FROM experiments
                    ORDER BY created_at DESC
                    LIMIT 50
                """)
                cols = [d[0] for d in cur.description]
                rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            conn.close()

            # Convert params_json from dict/str safely
            for r in rows:
                if isinstance(r.get("params_json"), str):
                    try:
                        r["params_json"] = json.loads(r["params_json"])
                    except Exception:
                        pass
                if r.get("created_at"):
                    r["created_at"] = r["created_at"].isoformat()

            return cors_response(200, {"experiments": rows})
        except Exception as e:
            conn.close()
            return cors_response(500, {"error": str(e)})

    # ── POST /save: save experiment ──────────────────────────────────────────
    if request.method == "POST":
        conn = get_conn()
        if conn is None:
            return cors_response(200, {"id": None, "message": "DB not configured — experiment not saved"})
        try:
            body = json.loads(request.body)
            ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO experiments
                        (algorithm, dataset_name, params_json,
                         silhouette_score, db_score, ch_score,
                         n_clusters_found, plot_data, metrics_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    body.get("algorithm"),
                    body.get("dataset_name"),
                    json.dumps(body.get("params_json", {})),
                    body.get("silhouette_score"),
                    body.get("db_score"),
                    body.get("ch_score"),
                    body.get("n_clusters_found"),
                    json.dumps(body.get("plot_data")) if body.get("plot_data") else None,
                    json.dumps(body.get("metrics_json")) if body.get("metrics_json") else None,
                ))
                row = cur.fetchone()
            conn.commit()
            conn.close()
            return cors_response(201, {
                "id": row[0],
                "created_at": row[1].isoformat(),
                "message": "Experiment saved successfully",
            })
        except Exception as e:
            conn.close()
            return cors_response(500, {"error": str(e)})

    return cors_response(405, {"error": "Method not allowed"})
