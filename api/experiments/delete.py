"""
Vercel Python Serverless Function
Route: DELETE /api/experiments/delete?id=<id>
Deletes an experiment from Neon PostgreSQL.
"""
import json
import sys
import os
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import cors_response, options_response, get_conn


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    if request.method != "DELETE":
        return cors_response(405, {"error": "Method not allowed"})

    # Parse ?id= from query string
    try:
        parsed = urlparse(request.url if hasattr(request, "url") else "")
        qs = parse_qs(parsed.query)
        exp_id = int(qs.get("id", [None])[0])
    except (TypeError, ValueError):
        return cors_response(400, {"error": "Missing or invalid ?id= query param"})

    conn = get_conn()
    if conn is None:
        return cors_response(503, {"error": "DB not configured"})

    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM experiments WHERE id = %s", (exp_id,))
        conn.commit()
        conn.close()
        return cors_response(200, {"deleted": exp_id})
    except Exception as e:
        conn.close()
        return cors_response(500, {"error": str(e)})
