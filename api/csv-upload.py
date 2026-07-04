import sys, os, io
import numpy as np
import pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
from _utils import ok, err, opts

def handler(request, response):
    if request.method == "OPTIONS":
        response.status_code = 200
        return
    if request.method != "POST":
        response.status_code = 405
        return err("Method not allowed")
    try:
        raw = request.body
        text = raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else raw
        df  = pd.read_csv(io.StringIO(text))
        num = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(num) < 2:
            response.status_code = 400
            return err("CSV must have at least 2 numeric columns")
        response.status_code = 200
        return ok({
            "csv_data": text,
            "columns":  num,
            "n_rows":   int(len(df)),
            "preview":  df[num].head(5).fillna(0).to_dict(orient="records"),
        })
    except Exception as e:
        response.status_code = 400
        return err(f"CSV parse error: {e}")
