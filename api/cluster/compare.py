"""
Vercel Python Serverless Function
Route: POST /api/cluster/compare
Runs all 3 algorithms and returns side-by-side results.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import cors_response, options_response, run_clustering

DEFAULTS = {
    "kmeans":       {"n_clusters": 3, "init": "k-means++", "max_iter": 300},
    "dbscan":       {"eps": 0.5, "min_samples": 5},
    "hierarchical": {"n_clusters": 3, "linkage": "ward"},
}


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    if request.method != "POST":
        return cors_response(405, {"error": "Method not allowed"})

    try:
        body     = json.loads(request.body)
        dataset  = body.get("dataset", "blobs")
        csv_data = body.get("csv_data")

        results = {}
        for algo, default_params in DEFAULTS.items():
            try:
                results[algo] = run_clustering(dataset, algo, default_params, csv_data)
            except Exception as e:
                results[algo] = {"error": str(e)}

        return cors_response(200, results)

    except Exception as e:
        return cors_response(500, {"error": str(e)})
