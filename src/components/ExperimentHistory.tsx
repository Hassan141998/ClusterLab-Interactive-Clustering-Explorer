"use client";
import { useState, useEffect, useCallback } from "react";
import { History, Trash2, RefreshCw, Download, ChevronDown, ChevronUp, Database } from "lucide-react";
import { getExperiments, deleteExperiment } from "@/lib/api";
import { formatScore, scoreQuality, QUALITY_COLORS } from "@/lib/colors";
import type { Experiment } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  onReload: (exp: Experiment) => void;
  refreshTrigger: number;
}

export default function ExperimentHistory({ onReload, refreshTrigger }: Props) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchExps = useCallback(async () => {
    setLoading(true);
    try {
      const { experiments: exps } = await getExperiments();
      setExperiments(exps);
    } catch {
      // DB may not be configured
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExps(); }, [fetchExps, refreshTrigger]);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteExperiment(id);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
    } catch {}
    setDeleting(null);
  }

  function exportCSV() {
    const header = "id,algorithm,dataset,silhouette,db_score,ch_score,n_clusters,created_at";
    const rows = experiments.map((e) =>
      [e.id, e.algorithm, e.dataset_name, e.silhouette_score ?? "", e.db_score ?? "", e.ch_score ?? "", e.n_clusters_found ?? "", e.created_at].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "clusterlab_experiments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const ALGO_COLORS: Record<string, string> = {
    kmeans: "#7c3aed",
    dbscan: "#06b6d4",
    hierarchical: "#10b981",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-purple-light" />
          <span className="text-xs font-mono text-muted uppercase tracking-widest">Experiment History</span>
          {experiments.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple/20 text-purple-light">
              {experiments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {experiments.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted hover:text-text border border-border hover:border-purple/50 transition-all"
            >
              <Download size={10} />
              CSV
            </button>
          )}
          <button
            onClick={fetchExps}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted hover:text-text border border-border hover:border-purple/50 transition-all"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading && experiments.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 shimmer rounded-lg" />)}
        </div>
      )}

      {!loading && experiments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg">
          <Database size={24} className="text-muted mb-2" />
          <p className="text-xs text-muted font-mono">No experiments saved yet</p>
          <p className="text-xs text-muted/50 font-mono mt-1">Save experiments to track your results</p>
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {experiments.map((exp) => {
          const isExp = expanded === exp.id;
          const algoColor = ALGO_COLORS[exp.algorithm] ?? "#7c3aed";
          const silQ = scoreQuality(exp.silhouette_score, "silhouette");

          return (
            <div
              key={exp.id}
              className="border border-border rounded-lg overflow-hidden bg-surface2 transition-all"
              style={{ borderColor: isExp ? `${algoColor}44` : undefined }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* Algo badge */}
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
                  style={{ color: algoColor, background: `${algoColor}1a`, border: `1px solid ${algoColor}33` }}
                >
                  {exp.algorithm.toUpperCase()}
                </span>

                {/* Dataset + time */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-text truncate">{exp.dataset_name}</div>
                  <div className="text-[10px] text-muted font-mono">
                    {formatDistanceToNow(new Date(exp.created_at), { addSuffix: true })}
                  </div>
                </div>

                {/* Silhouette */}
                <div className="shrink-0 text-right">
                  <div className="text-[10px] text-muted font-mono">sil</div>
                  <div
                    className="text-xs font-mono font-semibold"
                    style={{ color: QUALITY_COLORS[silQ] }}
                  >
                    {formatScore(exp.silhouette_score, 3)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onReload(exp)}
                    className="p-1 rounded text-muted hover:text-purple-light hover:bg-purple/10 transition-all"
                    title="Reload experiment"
                  >
                    <RefreshCw size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    disabled={deleting === exp.id}
                    className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete"
                  >
                    {deleting === exp.id
                      ? <RefreshCw size={11} className="animate-spin" />
                      : <Trash2 size={11} />
                    }
                  </button>
                  <button
                    onClick={() => setExpanded(isExp ? null : exp.id)}
                    className="p-1 rounded text-muted hover:text-text transition-all"
                  >
                    {isExp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExp && (
                <div className="border-t border-border px-3 py-3 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Silhouette", val: exp.silhouette_score, m: "silhouette" as const },
                      { label: "Davies-Bouldin", val: exp.db_score, m: "db" as const },
                      { label: "Calinski-Harabasz", val: exp.ch_score, m: "ch" as const },
                    ].map(({ label, val, m }) => {
                      const q = scoreQuality(val, m);
                      return (
                        <div key={label} className="text-center p-2 rounded bg-surface border border-border">
                          <div className="text-[9px] text-muted font-mono mb-1">{label}</div>
                          <div className="text-sm font-mono font-semibold" style={{ color: QUALITY_COLORS[q] }}>
                            {formatScore(val, 4)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="terminal-box p-2 text-[10px] font-mono text-muted space-y-0.5">
                    <div>n_clusters_found=<span className="text-neon">{exp.n_clusters_found}</span></div>
                    <div>params={JSON.stringify(exp.params_json)}</div>
                    <div>saved_at=<span className="text-purple-light">{new Date(exp.created_at).toLocaleString()}</span></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
