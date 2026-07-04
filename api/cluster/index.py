import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import ok, err, opts, parse_body, run_clustering

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    if request.method != "POST":
        response.status_code = 405
        return err("Method not allowed")
    try:
        body = parse_body(request)
        result = run_clustering(
            body.get("dataset","blobs"),
            body.get("algorithm","kmeans"),
            body.get("params",{}),
            body.get("csv_data")
        )
        response.status_code = 200
        return ok(result)
    except ValueError as e:
        response.status_code = 400
        return err(str(e))
    except Exception as e:
        response.status_code = 500
        return err(str(e))
