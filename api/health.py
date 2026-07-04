import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _utils import ok, opts, get_conn
from http.server import BaseHTTPRequestHandler

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    conn = get_conn()
    db = "not_configured"
    if conn:
        try: conn.close(); db = "connected"
        except: db = "error"
    response.status_code = 200
    return ok({"status":"ok","version":"2.0.0","db":db})
