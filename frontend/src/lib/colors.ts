export const CLUSTER_COLORS = [
  "#7c3aed", // purple
  "#39ff14", // neon green
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

export const NOISE_COLOR = "#4b5563"; // gray for DBSCAN noise

export function getClusterColor(label: number): string {
  if (label === -1) return NOISE_COLOR;
  return CLUSTER_COLORS[label % CLUSTER_COLORS.length];
}

export function formatScore(val: number | null | undefined, digits = 4): string {
  if (val === null || val === undefined) return "N/A";
  return val.toFixed(digits);
}

export function scoreQuality(score: number | null, metric: "silhouette" | "db" | "ch"): "good" | "ok" | "bad" | "na" {
  if (score === null) return "na";
  if (metric === "silhouette") {
    if (score > 0.6) return "good";
    if (score > 0.3) return "ok";
    return "bad";
  }
  if (metric === "db") {
    if (score < 0.5) return "good";
    if (score < 1.0) return "ok";
    return "bad";
  }
  // ch: higher is better, no universal threshold
  if (score > 500) return "good";
  if (score > 100) return "ok";
  return "bad";
}

export const QUALITY_COLORS: Record<string, string> = {
  good: "#39ff14",
  ok: "#f59e0b",
  bad: "#f43f5e",
  na: "#6b7280",
};
