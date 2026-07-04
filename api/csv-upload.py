"""
Vercel Python Serverless Function
Route: POST /api/csv-upload
Parses an uploaded CSV and returns numeric columns + preview.
"""
import json
import sys
import os
import io
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from _utils import cors_response, options_response


def handler(request, response=None):
    if request.method == "OPTIONS":
        return options_response()

    if request.method != "POST":
        return cors_response(405, {"error": "Method not allowed"})

    try:
        # Vercel provides raw body as bytes or string
        body = request.body
        if isinstance(body, (bytes, bytearray)):
            text = body.decode("utf-8")
        else:
            text = body

        df = pd.read_csv(io.StringIO(text))
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        if len(numeric_cols) < 2:
            return cors_response(400, {"error": "CSV must have at least 2 numeric columns"})

        preview = df[numeric_cols].head(5).fillna(0).to_dict(orient="records")

        return cors_response(200, {
            "csv_data": text,
            "columns":  numeric_cols,
            "n_rows":   int(len(df)),
            "preview":  preview,
        })

    except Exception as e:
        return cors_response(400, {"error": f"CSV parse error: {e}"})
