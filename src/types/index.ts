export type Algorithm = "kmeans" | "dbscan" | "hierarchical";
export type Dataset = "iris" | "blobs" | "moons" | "circles" | "mall" | "wholesale" | "csv";

export interface KMeansParams {
  n_clusters: number;
  init: "k-means++" | "random";
  max_iter: number;
}

export interface DBSCANParams {
  eps: number;
  min_samples: number;
}

export interface HierarchicalParams {
  n_clusters: number;
  linkage: "ward" | "complete" | "average" | "single";
}

export type AlgorithmParams = KMeansParams | DBSCANParams | HierarchicalParams;

export interface PlotData {
  x: number[];
  y: number[];
  labels: number[];
  feature_names: string[];
  n_points: number;
}

export interface ElbowData {
  k: number[];
  inertia: number[];
  silhouette: number[];
  best_k: number;
}

export interface DendrogramData {
  icoord: number[][];
  dcoord: number[][];
  leaves: number[];
  color_list: string[];
  error?: string;
}

export interface ClusterMetrics {
  n_clusters_found: number;
  silhouette_score: number | null;
  db_score: number | null;
  ch_score: number | null;
  noise_points?: number;
}

export interface ClusterResult {
  cluster_labels: number[];
  metrics: ClusterMetrics;
  plot_data: PlotData;
  silhouette_score: number | null;
  extra: {
    elbow?: ElbowData;
    cluster_centers_2d?: number[][];
    core_sample_indices?: number[];
    dendrogram?: DendrogramData;
  };
  dataset_info: {
    n_samples: number;
    n_features: number;
    columns: string[];
  };
}

export interface Experiment {
  id: number;
  algorithm: string;
  dataset_name: string;
  params_json: Record<string, unknown>;
  silhouette_score: number | null;
  db_score: number | null;
  ch_score: number | null;
  n_clusters_found: number | null;
  plot_data: PlotData | null;
  metrics_json: Record<string, unknown> | null;
  created_at: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  n_samples: number;
  n_features: number;
}
