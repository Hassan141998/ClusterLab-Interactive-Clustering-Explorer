"use client";
import { useEffect, useRef, useState } from "react";
import { getClusterColor, CLUSTER_COLORS } from "@/lib/colors";
import type { PlotData, Algorithm } from "@/types";

interface Props {
  plotData: PlotData | null;
  algorithm: Algorithm;
  centerPoints?: number[][];
  loading?: boolean;
  animated?: boolean;
}

export default function ScatterPlot({ plotData, algorithm, centerPoints, loading, animated }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [Plotly, setPlotly] = useState<typeof import("plotly.js") | null>(null);

  // Dynamically import Plotly (client-only)
  useEffect(() => {
    import("plotly.js").then((m) => setPlotly(m.default ?? m));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !plotData) return;

    const labels = plotData.labels;
    const uniqueLabels = [...new Set(labels)].sort((a, b) => a - b);

    const traces = uniqueLabels.map((label) => {
      const mask = labels.map((l) => l === label);
      const x = plotData.x.filter((_, i) => mask[i]);
      const y = plotData.y.filter((_, i) => mask[i]);
      const color = getClusterColor(label);
      const name = label === -1 ? "Noise" : `Cluster ${label}`;

      return {
        type: "scatter" as const,
        mode: "markers" as const,
        name,
        x,
        y,
        marker: {
          color,
          size: 8,
          opacity: label === -1 ? 0.4 : 0.85,
          line: { color: "#0d0d0d", width: 0.5 },
        },
        hovertemplate: `<b>${name}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>`,
      };
    });

    // K-Means centers
    if (centerPoints && centerPoints.length > 0) {
      traces.push({
        type: "scatter" as const,
        mode: "markers" as const,
        name: "Centers",
        x: centerPoints.map((c) => c[0]),
        y: centerPoints.map((c) => c[1]),
        marker: {
          color: "#ffffff",
          size: 14,
          // @ts-ignore
          symbol: "x",
          line: { color: "#7c3aed", width: 2 },
          opacity: 1,
        },
        hovertemplate: `<b>Centroid</b><br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>`,
      });
    }

    const layout = {
      paper_bgcolor: "transparent",
      plot_bgcolor: "#111111",
      font: { color: "#9ca3af", family: "Roboto Mono, monospace", size: 11 },
      xaxis: {
        title: { text: plotData.feature_names[0] ?? "PC1", font: { color: "#6b7280" } },
        gridcolor: "#1f1f1f",
        zerolinecolor: "#262626",
        color: "#6b7280",
      },
      yaxis: {
        title: { text: plotData.feature_names[1] ?? "PC2", font: { color: "#6b7280" } },
        gridcolor: "#1f1f1f",
        zerolinecolor: "#262626",
        color: "#6b7280",
      },
      legend: {
        bgcolor: "rgba(20,20,20,0.9)",
        bordercolor: "#262626",
        borderwidth: 1,
        font: { color: "#9ca3af", size: 10 },
      },
      margin: { l: 50, r: 20, t: 20, b: 50 },
      hovermode: "closest" as const,
      hoverlabel: {
        bgcolor: "#1a1a1a",
        bordercolor: "#7c3aed",
        font: { color: "#e5e7eb", family: "Roboto Mono", size: 12 },
      },
      annotations: [
        {
          text: algorithm.toUpperCase(),
          x: 0.02, y: 0.98,
          xref: "paper", yref: "paper",
          showarrow: false,
          font: { color: "#7c3aed", size: 10, family: "Roboto Mono" },
          bgcolor: "rgba(124,58,237,0.1)",
          bordercolor: "#7c3aed",
          borderwidth: 1,
          borderpad: 4,
        },
      ],
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "toImage"] as any,
    };

    Plotly.react(plotRef.current, traces, layout as any, config);
  }, [Plotly, plotData, algorithm, centerPoints]);

  return (
    <div className="relative w-full h-full min-h-[380px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-muted animate-pulse">Clustering…</span>
          </div>
        </div>
      )}
      {!plotData && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg">
          <div className="w-12 h-12 rounded-full bg-purple/10 flex items-center justify-center mb-3">
            <span className="text-2xl">◉</span>
          </div>
          <p className="text-sm text-muted font-mono">Select a dataset and click</p>
          <p className="text-sm font-mono"><span className="text-purple-light">Run Clustering</span></p>
        </div>
      )}
      <div ref={plotRef} className="w-full h-full" />
    </div>
  );
}
