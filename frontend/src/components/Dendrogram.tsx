"use client";
import { useEffect, useRef, useState } from "react";
import type { DendrogramData } from "@/types";

interface Props {
  data: DendrogramData | null;
  nClusters: number;
  loading?: boolean;
}

export default function Dendrogram({ data, nClusters, loading }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [Plotly, setPlotly] = useState<typeof import("plotly.js") | null>(null);

  useEffect(() => {
    import("plotly.js").then((m) => setPlotly(m.default ?? m));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !data || data.error) return;

    const COLORS = [
      "#7c3aed", "#39ff14", "#f59e0b", "#06b6d4",
      "#f43f5e", "#8b5cf6", "#10b981", "#3b82f6",
    ];

    // Build line traces from icoord/dcoord
    const traces = data.icoord.map((xs, i) => ({
      type: "scatter" as const,
      mode: "lines" as const,
      x: data.dcoord[i],
      y: xs,
      line: {
        color: COLORS[i % COLORS.length],
        width: 1.5,
        opacity: 0.75,
      },
      hoverinfo: "skip" as const,
      showlegend: false,
    }));

    // Find cut threshold – approximate
    const allDist = data.dcoord.flat().filter((v) => v > 0);
    allDist.sort((a, b) => b - a);
    const cutIdx = Math.min(nClusters - 1, allDist.length - 1);
    const cutThreshold = allDist[cutIdx] ?? 0;

    const layout = {
      paper_bgcolor: "transparent",
      plot_bgcolor: "#111111",
      font: { color: "#9ca3af", family: "Roboto Mono, monospace", size: 10 },
      xaxis: {
        title: { text: "Distance", font: { color: "#6b7280", size: 10 } },
        gridcolor: "#1f1f1f",
        color: "#6b7280",
      },
      yaxis: {
        title: { text: "Sample Index", font: { color: "#6b7280", size: 10 } },
        gridcolor: "#1f1f1f",
        color: "#6b7280",
        tickfont: { size: 8 },
      },
      margin: { l: 50, r: 20, t: 20, b: 45 },
      hovermode: false as false,
      shapes: cutThreshold > 0 ? [
        {
          type: "line" as const,
          x0: cutThreshold, x1: cutThreshold,
          y0: 0, y1: 1,
          yref: "paper",
          line: { color: "#f59e0b", width: 2, dash: "dot" as const },
        },
      ] : [],
      annotations: cutThreshold > 0 ? [
        {
          x: cutThreshold, y: 1,
          xref: "x", yref: "paper",
          text: `cut (k=${nClusters})`,
          showarrow: false,
          font: { color: "#f59e0b", size: 9, family: "Roboto Mono" },
          xanchor: "left",
        },
      ] : [],
    };

    Plotly.react(plotRef.current, traces, layout as any, { responsive: true, displaylogo: false });
  }, [Plotly, data, nClusters]);

  if (loading) return <div className="h-56 shimmer rounded-lg" />;

  if (!data) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-border rounded-lg">
        <p className="text-xs text-muted font-mono">Run Hierarchical clustering to see dendrogram</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-red-500/30 rounded-lg">
        <p className="text-xs text-red-400 font-mono">Dendrogram error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-xs font-mono text-muted">
          Dashed line = cut at <span className="text-amber-400">k={nClusters}</span>{" "}
          (sampled 100 pts)
        </span>
      </div>
      <div ref={plotRef} className="w-full h-56" />
    </div>
  );
}
