import axios from "axios";
import type {
  Algorithm, Dataset, AlgorithmParams, ClusterResult,
  Experiment, DatasetInfo
} from "@/types";

/**
 * Deployed on Vercel  → BASE = ""  (same-origin /api/... routes)
 * Local dev (FastAPI) → BASE = "http://localhost:8000"
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const API = axios.create({
  baseURL: BASE,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

export async function runClustering(
  dataset: Dataset,
  algorithm: Algorithm,
  params: AlgorithmParams,
  csvData?: string
): Promise<ClusterResult> {
  const { data } = await API.post("/api/cluster", {
    dataset, algorithm, params, csv_data: csvData ?? null,
  });
  return data;
}

export async function compareAll(
  dataset: Dataset,
  params: Partial<AlgorithmParams>,
  csvData?: string
): Promise<Record<Algorithm, ClusterResult | { error: string }>> {
  const { data } = await API.post("/api/cluster/compare", {
    dataset, params, csv_data: csvData ?? null,
  });
  return data;
}

export async function uploadCSV(file: File): Promise<{
  csv_data: string;
  columns: string[];
  n_rows: number;
  preview: Record<string, number>[];
}> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await API.post("/api/csv-upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getExperiments(): Promise<{ experiments: Experiment[] }> {
  const { data } = await API.get("/api/experiments");
  return data;
}

export async function saveExperiment(payload: {
  algorithm: string;
  dataset_name: string;
  params_json: Record<string, unknown>;
  silhouette_score?: number | null;
  db_score?: number | null;
  ch_score?: number | null;
  n_clusters_found?: number | null;
  plot_data?: unknown;
  metrics_json?: unknown;
}): Promise<{ id: number; created_at: string; message: string }> {
  const { data } = await API.post("/api/experiments/save", payload);
  return data;
}

export async function deleteExperiment(id: number): Promise<void> {
  await API.delete(`/api/experiments/${id}`);
}

export async function getDatasets(): Promise<{ datasets: DatasetInfo[] }> {
  const { data } = await API.get("/api/datasets");
  return data;
}
