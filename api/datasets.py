import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _utils import ok, opts

DATASETS = [
    {"id":"iris",      "name":"Iris",           "description":"Classic 4-feature flower dataset",  "n_samples":150,"n_features":4},
    {"id":"blobs",     "name":"Blobs",           "description":"Well-separated Gaussian clusters",  "n_samples":300,"n_features":2},
    {"id":"moons",     "name":"Moons",           "description":"Two interleaving half-circles",     "n_samples":300,"n_features":2},
    {"id":"circles",   "name":"Circles",         "description":"Concentric circle rings",           "n_samples":300,"n_features":2},
    {"id":"mall",      "name":"Mall Customers",  "description":"Income vs spending score",          "n_samples":200,"n_features":2},
    {"id":"wholesale", "name":"Wholesale",       "description":"Product category spending (4D)",    "n_samples":250,"n_features":4},
]

def handler(request, response):
    response.status_code = 200
    return ok({"datasets": DATASETS})
