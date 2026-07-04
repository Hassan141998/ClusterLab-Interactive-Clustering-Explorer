"use client";
import { useEffect, useRef, useState } from "react";
import { GitCompare, Loader2 } from "lucide-react";
import { compareAll } from "@/lib/api";
import { getClusterColor, formatScore, scoreQuality, QUALITY_COLORS } from "@/lib/colors";
import type { Algorithm, Dataset, ClusterResult } from "@/types";

interface MiniPlotProps {
  result: ClusterResult;
  algorithm: string;
}

function MiniPlot({ result, algorithm }: MiniPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [Plotly, setPlotly] = useState<typeof import("plotly.js") | null>(null);

  useEffect(() => {
    import("plotly.js").then((m) => setPlotly(m.default ?? m));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current) return;
    const { plot_data } = result;
    const labels = plot_data.labels;
    const uniqueLabels = [...new Set(labels)].sort((a, b) => a - b);

    const traces = uniqueLabels.map((label) => {
      const mask = labels.map((l) => l === label);
      return {
        type: "scatter" as const,
        mode: "markers" as const,
        name: label === -1 ? "Noise" : `C${label}`,
        x: plot_data.x.filter((_, i) => mask[i]),
        y: plot_data.y.filter((_, i) => mask[i]),
        marker: { color: getClusterColor(label), size: 5, opacity: 0.8 },
        showlegend: false,
        hoverinfo: "skip" as const,
      };
    });

    const layout = {
      paper_bgcolor: "transparent",
      plot_bgcolor: "#0f0f0f",
      font: { color: "#6b7280", family: "Roboto Mono", size: 9 },
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false },
      margin: { l: 8, r: 8, t: 8, b: 8 },
      hovermode: false as false,
    };

    Plotly.react(plotRef.current, traces, layout as any, { responsive: true, displaylogo: false, staticPlot: true });
  }, [Plotly, result]);

  const m = result.metrics;
  const sil = m.silhouette_score;
  const silQ = scoreQuality(sil, "silhouette");

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface2 flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-purple-light font-semibold uppercase">{algorithm}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">k={m.n_clusters_found}</span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: QUALITY_COLORS[silQ], background: `${QUALITY_COLORS[silQ]}1a` }}
          >
            sil={formatScore(sil, 3)}
          </span>
        </div>
      </div>
      <div ref={plotRef} className="flex-1 h-44" />
      <div className="px-3 py-2 border-t border-border grid grid-cols-3 gap-1">
        {[
          { label: "Silhouette", val: m.silhouette_score, metric: "silhouette" as const },
          { label: "D-B", val: m.db_score, metric: "db" as const },
          { label: "CH", val: m.ch_score, metric: "ch" as const },
        ].map(({ label, val, metric }) => {
          const q = scoreQuality(val, metric);
          return (
            <div key={label} className="text-center">
              <div className="text-[9px] text-muted font-mono">{label}</div>
              <div className="text-xs font-mono font-semibold" style={{ color: QUALITY_COLORS[q] }}>
                {formatScore(val, 3)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  dataset: Dataset;
  csvData?: string;
}

export default function CompareView({ dataset, csvData }: Props) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, ClusterResult | { error: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await compareAll(dataset, {}, csvData);
      setResults(res as Record<string, ClusterResult | { error: string }>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  const ALGO_LABELS: Record<string, string> = {
    kmeans: "K-Means",
    dbscan: "DBSCAN",
    hierarchical: "Hierarchical",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-purple-light" />
          <span className="text-xs font-mono text-muted uppercase tracking-widest">Side-by-Side Compare</span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple hover:bg-purple-dark text-white text-xs font-mono transition-all disabled:opacity-50 shadow-neon-purple"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <GitCompare size={12} />}
          {loading ? "Running…" : "Run All 3"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 shimmer rounded-lg" />
          ))}
        </div>
      )}

      {results && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {Object.entries(results).map(([algo, result]) => {
            if ("error" in result) {
              return (
                <div key={algo} className="border border-red-500/20 rounded-lg p-4 bg-red-500/5">
                  <p className="text-xs text-red-400 font-mono">{algo}: {result.error}</p>
                </div>
              );
            }
            return (
              <MiniPlot key={algo} result={result} algorithm={ALGO_LABELS[algo] ?? algo} />
            );
          })}
        </div>
      )}

      {!results && !loading && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg">
          <GitCompare size={32} className="text-muted mb-3" />
          <p className="text-sm text-muted font-mono">Click "Run All 3" to compare algorithms</p>
          <p className="text-xs text-muted/50 font-mono mt-1">Uses default params for each algorithm</p>
        </div>
      )}
    </div>
  );
}
