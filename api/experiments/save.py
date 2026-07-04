import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import ok, err, opts, parse_body, get_conn, ensure_table

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    if request.method != "POST":
        response.status_code = 405
        return err("Method not allowed")
    conn = get_conn()
    if not conn:
        response.status_code = 200
        return ok({"id":None,"message":"DB not configured — add DATABASE_URL in Vercel env vars"})
    try:
        body = parse_body(request)
        ensure_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO experiments (algorithm,dataset_name,params_json,silhouette_score,db_score,ch_score,n_clusters_found,plot_data,metrics_json)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,created_at
            """, (
                body.get("algorithm"), body.get("dataset_name"),
                json.dumps(body.get("params_json",{})),
                body.get("silhouette_score"), body.get("db_score"),
                body.get("ch_score"), body.get("n_clusters_found"),
                json.dumps(body.get("plot_data")) if body.get("plot_data") else None,
                json.dumps(body.get("metrics_json")) if body.get("metrics_json") else None,
            ))
            row = cur.fetchone()
        conn.commit(); conn.close()
        response.status_code = 201
        return ok({"id":row[0],"created_at":row[1].isoformat(),"message":"Saved successfully"})
    except Exception as e:
        try: conn.close()
        except: pass
        response.status_code = 500
        return err(str(e))
