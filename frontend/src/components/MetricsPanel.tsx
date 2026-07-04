"use client";
import { TrendingUp, AlertCircle, BarChart2, Layers } from "lucide-react";
import { formatScore, scoreQuality, QUALITY_COLORS } from "@/lib/colors";
import type { ClusterMetrics } from "@/types";

interface MetricCardProps {
  label: string;
  value: number | null;
  metric: "silhouette" | "db" | "ch";
  hint: string;
  icon: React.ReactNode;
  direction: "higher" | "lower";
}

function MetricCard({ label, value, metric, hint, icon, direction }: MetricCardProps) {
  const quality = scoreQuality(value, metric);
  const color = QUALITY_COLORS[quality];
  const digits = metric === "ch" ? 1 : 4;

  return (
    <div
      className="metric-card p-3 rounded-lg border border-border bg-surface2 space-y-2"
      style={{ borderColor: value !== null ? `${color}33` : undefined }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color }} className="opacity-80">{icon}</span>
          <span className="text-xs text-muted font-mono">{label}</span>
        </div>
        {value !== null && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color, background: `${color}1a` }}
          >
            {quality === "good" ? "✓ GOOD" : quality === "ok" ? "~ OK" : "✗ POOR"}
          </span>
        )}
      </div>
      <div className="text-xl font-mono font-semibold" style={{ color: value !== null ? color : "#4b5563" }}>
        {formatScore(value, digits)}
      </div>
      <p className="text-[10px] text-muted leading-tight">{hint}</p>
      <p className="text-[10px] font-mono text-muted/50">
        {direction === "higher" ? "↑ higher is better" : "↓ lower is better"}
      </p>
    </div>
  );
}

interface Props {
  metrics: ClusterMetrics | null;
  loading: boolean;
}

export default function MetricsPanel({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-28 border border-dashed border-border rounded-lg">
        <p className="text-xs text-muted font-mono">Run clustering to see metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Silhouette"
          value={metrics.silhouette_score}
          metric="silhouette"
          hint="Cohesion vs separation. Range: [-1, 1]"
          icon={<TrendingUp size={12} />}
          direction="higher"
        />
        <MetricCard
          label="Davies-Bouldin"
          value={metrics.db_score}
          metric="db"
          hint="Avg similarity between clusters. Range: [0, ∞)"
          icon={<AlertCircle size={12} />}
          direction="lower"
        />
        <MetricCard
          label="Calinski-Harabasz"
          value={metrics.ch_score}
          metric="ch"
          hint="Ratio of between/within cluster dispersion"
          icon={<BarChart2 size={12} />}
          direction="higher"
        />
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3 p-3 terminal-box">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-purple-light" />
          <span className="text-xs font-mono text-muted">clusters_found=</span>
          <span className="text-xs font-mono text-neon">{metrics.n_clusters_found}</span>
        </div>
        {metrics.noise_points !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted">noise_points=</span>
            <span className="text-xs font-mono text-amber-400">{metrics.noise_points}</span>
          </div>
        )}
      </div>
    </div>
  );
}
