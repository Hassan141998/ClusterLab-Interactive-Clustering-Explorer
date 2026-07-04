"use client";
import { useEffect, useRef, useState } from "react";
import type { ElbowData } from "@/types";

interface Props {
  data: ElbowData | null;
  loading?: boolean;
}

export default function ElbowChart({ data, loading }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [Plotly, setPlotly] = useState<typeof import("plotly.js") | null>(null);

  useEffect(() => {
    import("plotly.js").then((m) => setPlotly(m.default ?? m));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !data) return;

    const bestIdx = data.k.indexOf(data.best_k);

    const traces = [
      {
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: "Inertia",
        x: data.k,
        y: data.inertia,
        yaxis: "y",
        line: { color: "#7c3aed", width: 2 },
        marker: { color: "#7c3aed", size: 6 },
        hovertemplate: "K=%{x}<br>Inertia: %{y:.1f}<extra></extra>",
      },
      {
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: "Silhouette",
        x: data.k,
        y: data.silhouette,
        yaxis: "y2",
        line: { color: "#39ff14", width: 2, dash: "dot" as const },
        marker: { color: "#39ff14", size: 6 },
        hovertemplate: "K=%{x}<br>Silhouette: %{y:.4f}<extra></extra>",
      },
      // Best K marker
      {
        type: "scatter" as const,
        mode: "markers" as const,
        name: `Best K=${data.best_k}`,
        x: [data.best_k],
        y: [data.silhouette[bestIdx]],
        yaxis: "y2",
        marker: { color: "#f59e0b", size: 14, symbol: "star", line: { color: "#ffffff", width: 1 } },
        hovertemplate: `<b>Optimal K=${data.best_k}</b><br>Silhouette: %{y:.4f}<extra></extra>`,
      },
    ];

    const layout = {
      paper_bgcolor: "transparent",
      plot_bgcolor: "#111111",
      font: { color: "#9ca3af", family: "Roboto Mono, monospace", size: 10 },
      xaxis: {
        title: { text: "Number of Clusters (K)", font: { color: "#6b7280", size: 10 } },
        gridcolor: "#1f1f1f",
        color: "#6b7280",
        dtick: 1,
      },
      yaxis: {
        title: { text: "Inertia (↓)", font: { color: "#7c3aed", size: 10 } },
        gridcolor: "#1f1f1f",
        color: "#7c3aed",
      },
      yaxis2: {
        title: { text: "Silhouette (↑)", font: { color: "#39ff14", size: 10 } },
        overlaying: "y",
        side: "right",
        color: "#39ff14",
        showgrid: false,
      },
      legend: {
        bgcolor: "rgba(20,20,20,0.9)",
        bordercolor: "#262626",
        borderwidth: 1,
        font: { color: "#9ca3af", size: 9 },
        x: 0.5, y: 1.1,
        orientation: "h" as const,
        xanchor: "center",
      },
      margin: { l: 55, r: 55, t: 30, b: 45 },
      hovermode: "x unified" as const,
      hoverlabel: {
        bgcolor: "#1a1a1a",
        bordercolor: "#7c3aed",
        font: { color: "#e5e7eb", family: "Roboto Mono", size: 11 },
      },
      shapes: [
        {
          type: "line" as const,
          x0: data.best_k, x1: data.best_k,
          y0: 0, y1: 1,
          yref: "paper",
          line: { color: "#f59e0b", width: 1, dash: "dashdot" as const },
        },
      ],
    };

    Plotly.react(plotRef.current, traces, layout as any, { responsive: true, displaylogo: false });
  }, [Plotly, data]);

  if (loading) {
    return <div className="h-52 shimmer rounded-lg" />;
  }

  if (!data) {
    return (
      <div className="h-52 flex items-center justify-center border border-dashed border-border rounded-lg">
        <p className="text-xs text-muted font-mono">Run K-Means to see Elbow chart</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-mono text-muted">
          Optimal K suggested: <span className="text-amber-400 font-semibold">{data.best_k}</span>
        </span>
      </div>
      <div ref={plotRef} className="w-full h-52" />
    </div>
  );
}
