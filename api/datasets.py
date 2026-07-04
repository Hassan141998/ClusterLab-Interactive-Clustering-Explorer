"""
Vercel Python Serverless Function
Route: GET /api/datasets
Returns metadata for all built-in datasets.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _utils import cors_response, options_response


DATASETS = [
    {"id": "iris",       "name": "Iris",            "description": "Classic 4-feature flower dataset",   "n_samples": 150,  "n_features": 4},
    {"id": "blobs",      "name": "Blobs",            "description": "Well-separated Gaussian clusters",   "n_samples": 300,  "n_features": 2},
    {"id": "moons",      "name": "Moons",            "description": "Two interleaving half-circles",       "n_samples": 300,  "n_features": 2},
    {"id": "circles",    "name": "Circles",          "description": "Concentric circle rings",              "n_samples": 300,  "n_features": 2},
    {"id": "mall",       "name": "Mall Customers",   "description": "Annual income vs spending score",     "n_samples": 200,  "n_features": 2},
    {"id": "wholesale",  "name": "Wholesale",        "description": "Product category spend (4D)",         "n_samples": 250,  "n_features": 4},
]


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()
    return cors_response(200, {"datasets": DATASETS})
