import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import ok, err, opts, parse_body, run_clustering

DEFAULTS = {
    "kmeans":       {"n_clusters":3,"init":"k-means++","max_iter":300},
    "dbscan":       {"eps":0.5,"min_samples":5},
    "hierarchical": {"n_clusters":3,"linkage":"ward"},
}

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    if request.method != "POST":
        response.status_code = 405
        return err("Method not allowed")
    try:
        body = parse_body(request)
        dataset  = body.get("dataset","blobs")
        csv_data = body.get("csv_data")
        results  = {}
        for algo, dparams in DEFAULTS.items():
            try:
                results[algo] = run_clustering(dataset, algo, dparams, csv_data)
            except Exception as e:
                results[algo] = {"error": str(e)}
        response.status_code = 200
        return ok(results)
    except Exception as e:
        response.status_code = 500
        return err(str(e))
