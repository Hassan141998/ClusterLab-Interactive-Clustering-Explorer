import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import ok, err, opts, parse_body, get_conn, ensure_table

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return

    if request.method == "GET":
        conn = get_conn()
        if not conn:
            response.status_code = 200
            return ok({"experiments":[],"message":"DB not configured"})
        try:
            ensure_table(conn)
            import psycopg2.extras
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT id,algorithm,dataset_name,params_json,silhouette_score,db_score,ch_score,n_clusters_found,metrics_json,created_at FROM experiments ORDER BY created_at DESC LIMIT 50")
                rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            for r in rows:
                if r.get("created_at"): r["created_at"] = r["created_at"].isoformat()
            response.status_code = 200
            return ok({"experiments": rows})
        except Exception as e:
            try: conn.close()
            except: pass
            response.status_code = 500
            return err(str(e))

    response.status_code = 405
    return err("Method not allowed")
