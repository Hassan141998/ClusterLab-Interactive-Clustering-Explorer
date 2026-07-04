import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import ok, err, opts, get_conn

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    if request.method != "DELETE":
        response.status_code = 405
        return err("Method not allowed")
    try:
        exp_id = int(request.args.get("id", 0))
    except (ValueError, TypeError):
        response.status_code = 400
        return err("Missing ?id= param")
    conn = get_conn()
    if not conn:
        response.status_code = 503
        return err("DB not configured")
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM experiments WHERE id=%s", (exp_id,))
        conn.commit(); conn.close()
        response.status_code = 200
        return ok({"deleted": exp_id})
    except Exception as e:
        try: conn.close()
        except: pass
        response.status_code = 500
        return err(str(e))
