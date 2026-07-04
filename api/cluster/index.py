"""
Vercel Python Serverless Function
Route: POST /api/cluster
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _utils import cors_response, options_response, run_clustering


def handler(request, response=None):
    # Vercel passes a Request-like object
    if request.method == "OPTIONS":
        return options_response()

    if request.method != "POST":
        return cors_response(405, {"error": "Method not allowed"})

    try:
        body = json.loads(request.body)
        dataset   = body.get("dataset", "blobs")
        algorithm = body.get("algorithm", "kmeans")
        params    = body.get("params", {})
        csv_data  = body.get("csv_data")

        result = run_clustering(dataset, algorithm, params, csv_data)
        return cors_response(200, result)

    except ValueError as e:
        return cors_response(400, {"error": str(e)})
    except Exception as e:
        return cors_response(500, {"error": str(e)})
