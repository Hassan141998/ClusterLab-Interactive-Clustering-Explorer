"""
Vercel Python Serverless Function
Route: GET /api/health
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _utils import cors_response, options_response, get_conn


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    db_ok = False
    try:
        conn = get_conn()
        if conn:
            conn.close()
            db_ok = True
    except Exception:
        pass

    return cors_response(200, {
        "status":  "ok",
        "version": "2.0.0",
        "db":      "connected" if db_ok else "not configured",
    })
