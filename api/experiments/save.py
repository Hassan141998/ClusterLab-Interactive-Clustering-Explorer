"""
Vercel Python Serverless Function
Route: POST /api/experiments/save
Saves a clustering experiment to Neon PostgreSQL.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import cors_response, options_response, get_conn, ensure_table


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    if request.method != "POST":
        return cors_response(405, {"error": "Method not allowed"})

    conn = get_conn()
    if conn is None:
        return cors_response(200, {
            "id": None,
            "message": "DB not configured — set DATABASE_URL in Vercel env vars"
        })

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
                json.dumps(body.get("plot_data"))    if body.get("plot_data")    else None,
                json.dumps(body.get("metrics_json")) if body.get("metrics_json") else None,
            ))
            row = cur.fetchone()

        conn.commit()
        conn.close()

        return cors_response(201, {
            "id":         row[0],
            "created_at": row[1].isoformat(),
            "message":    "Experiment saved successfully",
        })

    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return cors_response(500, {"error": str(e)})
