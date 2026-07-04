"use client";
import { useState, useCallback } from "react";
import { Play, Save, RotateCcw, Zap, GitCompare, History, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import DatasetSelector from "@/components/DatasetSelector";
import AlgorithmParams from "@/components/AlgorithmParams";
import ScatterPlot from "@/components/ScatterPlot";
import MetricsPanel from "@/components/MetricsPanel";
import ElbowChart from "@/components/ElbowChart";
import Dendrogram from "@/components/Dendrogram";
import CompareView from "@/components/CompareView";
import ExperimentHistory from "@/components/ExperimentHistory";
import { runClustering, saveExperiment } from "@/lib/api";
import type {
  Algorithm, Dataset, KMeansParams, DBSCANParams,
  HierarchicalParams, ClusterResult, Experiment
} from "@/types";

type Tab = "cluster" | "compare" | "history";

const DEFAULT_KMEANS: KMeansParams = { n_clusters: 3, init: "k-means++", max_iter: 300 };
const DEFAULT_DBSCAN: DBSCANParams = { eps: 0.5, min_samples: 5 };
const DEFAULT_HIERARCHICAL: HierarchicalParams = { n_clusters: 3, linkage: "ward" };

export default function Home() {
  // State
  const [dataset, setDataset] = useState<Dataset>("blobs");
  const [csvData, setCsvData] = useState<string | undefined>();
  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>("kmeans");
  const [kmeansParams, setKMeansParams] = useState<KMeansParams>(DEFAULT_KMEANS);
  const [dbscanParams, setDBSCANParams] = useState<DBSCANParams>(DEFAULT_DBSCAN);
  const [hierarchicalParams, setHierarchicalParams] = useState<HierarchicalParams>(DEFAULT_HIERARCHICAL);

  const [result, setResult] = useState<ClusterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("cluster");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [autoRun, setAutoRun] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const currentParams = algorithm === "kmeans" ? kmeansParams
    : algorithm === "dbscan" ? dbscanParams
    : hierarchicalParams;

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runClustering(dataset, algorithm, currentParams, csvData);
      setResult(res);
      setRunCount((c) => c + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clustering failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const resp = await saveExperiment({
        algorithm,
        dataset_name: dataset === "csv" ? (csvFilename ?? "custom_csv") : dataset,
        params_json: currentParams as unknown as Record<string, unknown>,
        silhouette_score: result.metrics.silhouette_score,
        db_score: result.metrics.db_score,
        ch_score: result.metrics.ch_score,
        n_clusters_found: result.metrics.n_clusters_found,
        plot_data: result.plot_data as unknown as Record<string, unknown>,
        metrics_json: result.metrics as unknown as Record<string, unknown>,
      });
      setSaveMsg(resp.message);
      setHistoryRefresh((n) => n + 1);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg("Save failed — check DB config");
    } finally {
      setSaving(false);
    }
  }

  function handleReloadExperiment(exp: Experiment) {
    setAlgorithm(exp.algorithm as Algorithm);
    setDataset(exp.dataset_name as Dataset);
    if (exp.algorithm === "kmeans" && exp.params_json) {
      setKMeansParams(exp.params_json as unknown as KMeansParams);
    } else if (exp.algorithm === "dbscan" && exp.params_json) {
      setDBSCANParams(exp.params_json as unknown as DBSCANParams);
    } else if (exp.algorithm === "hierarchical" && exp.params_json) {
      setHierarchicalParams(exp.params_json as unknown as HierarchicalParams);
    }
    setTab("cluster");
  }

  function handleReset() {
    setKMeansParams(DEFAULT_KMEANS);
    setDBSCANParams(DEFAULT_DBSCAN);
    setHierarchicalParams(DEFAULT_HIERARCHICAL);
    setResult(null);
    setError(null);
    setRunCount(0);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "cluster", label: "Cluster", icon: <Zap size={13} /> },
    { id: "compare", label: "Compare", icon: <GitCompare size={13} /> },
    { id: "history", label: "History", icon: <History size={13} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="scanline" />
      <Header />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Top nav tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                tab === t.id
                  ? "bg-purple text-white shadow-neon-purple"
                  : "text-muted hover:text-text hover:bg-surface2"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
          {runCount > 0 && (
            <span className="ml-auto text-xs font-mono text-muted">
              <span className="text-neon">{runCount}</span> runs
            </span>
          )}
        </div>

        {/* ── CLUSTER TAB ─────────────────────────────────────────────────── */}
        {tab === "cluster" && (
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
            {/* Left sidebar */}
            <aside className="space-y-6">
              {/* Dataset */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
                <DatasetSelector
                  selected={dataset}
                  onSelect={setDataset}
                  onCSVLoad={(data, name) => { setCsvData(data); setCsvFilename(name); }}
                  csvFilename={csvFilename}
                />
              </div>

              {/* Algorithm + params */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
                <AlgorithmParams
                  algorithm={algorithm}
                  onAlgorithmChange={setAlgorithm}
                  kmeansParams={kmeansParams}
                  dbscanParams={dbscanParams}
                  hierarchicalParams={hierarchicalParams}
                  onKMeansChange={setKMeansParams}
                  onDBSCANChange={setDBSCANParams}
                  onHierarchicalChange={setHierarchicalParams}
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple hover:bg-purple-dark text-white font-mono font-semibold transition-all shadow-neon-purple disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={16} className="group-hover:scale-110 transition-transform" />
                  )}
                  {loading ? "Running…" : "Run Clustering"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!result || saving}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border hover:border-neon/50 text-muted hover:text-neon text-sm font-mono transition-all disabled:opacity-40"
                  >
                    {saving
                      ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : <Save size={13} />
                    }
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border hover:border-border text-muted hover:text-text text-sm font-mono transition-all"
                  >
                    <RotateCcw size={13} />
                    Reset
                  </button>
                </div>

                {saveMsg && (
                  <div className={`text-xs font-mono text-center py-2 rounded-lg ${
                    saveMsg.includes("failed") ? "text-red-400 bg-red-400/10" : "text-neon bg-neon/5 border border-neon/20"
                  }`}>
                    {saveMsg.includes("failed") ? "⚠ " : "✓ "}{saveMsg}
                  </div>
                )}
              </div>

              {/* Dataset info */}
              {result && (
                <div className="terminal-box p-3 text-[11px] font-mono space-y-1 text-muted animate-fade-in">
                  <div className="text-purple-light mb-1">{"// dataset_info"}</div>
                  <div>n_samples=<span className="text-neon">{result.dataset_info.n_samples}</span></div>
                  <div>n_features=<span className="text-neon">{result.dataset_info.n_features}</span></div>
                  <div className="truncate">columns=[<span className="text-purple-light">{result.dataset_info.columns.join(", ")}</span>]</div>
                </div>
              )}
            </aside>

            {/* Main content */}
            <div className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-mono animate-fade-in">
                  ⚠ Error: {error}
                </div>
              )}

              {/* Scatter plot */}
              <div className="p-4 rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple animate-pulse" />
                    <span className="text-xs font-mono text-muted uppercase tracking-widest">
                      Cluster Scatter
                    </span>
                    {result && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple/20 text-purple-light">
                        {result.plot_data.n_points} pts
                      </span>
                    )}
                  </div>
                  {result && (
                    <span className="text-[10px] font-mono text-muted">
                      {result.plot_data.n_points > 2 ? "PCA→2D" : "raw 2D"}
                    </span>
                  )}
                </div>
                <div className="h-[400px]">
                  <ScatterPlot
                    plotData={result?.plot_data ?? null}
                    algorithm={algorithm}
                    centerPoints={result?.extra?.cluster_centers_2d}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="p-4 rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-neon" />
                  <span className="text-xs font-mono text-muted uppercase tracking-widest">Metrics</span>
                </div>
                <MetricsPanel metrics={result?.metrics ?? null} loading={loading} />
              </div>

              {/* Elbow chart (K-Means only) */}
              {algorithm === "kmeans" && (
                <div className="p-4 rounded-xl border border-border bg-surface animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-mono text-muted uppercase tracking-widest">Elbow Method</span>
                    <ChevronRight size={12} className="text-muted" />
                    <span className="text-xs font-mono text-muted">Find optimal K</span>
                  </div>
                  <ElbowChart data={result?.extra?.elbow ?? null} loading={loading} />
                </div>
              )}

              {/* Dendrogram (Hierarchical only) */}
              {algorithm === "hierarchical" && (
                <div className="p-4 rounded-xl border border-border bg-surface animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-muted uppercase tracking-widest">Dendrogram</span>
                  </div>
                  <Dendrogram
                    data={result?.extra?.dendrogram ?? null}
                    nClusters={hierarchicalParams.n_clusters}
                    loading={loading}
                  />
                </div>
              )}

              {/* DBSCAN info */}
              {algorithm === "dbscan" && result && (
                <div className="p-4 rounded-xl border border-border bg-surface animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-mono text-muted uppercase tracking-widest">DBSCAN Diagnostics</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="terminal-box p-3 text-center">
                      <div className="text-xs text-muted font-mono">Core Points</div>
                      <div className="text-lg font-mono text-cyan-400 mt-1">
                        {result.extra?.core_sample_indices?.length ?? 0}
                      </div>
                    </div>
                    <div className="terminal-box p-3 text-center">
                      <div className="text-xs text-muted font-mono">Noise Points</div>
                      <div className="text-lg font-mono text-amber-400 mt-1">
                        {result.metrics.noise_points ?? 0}
                      </div>
                    </div>
                    <div className="terminal-box p-3 text-center">
                      <div className="text-xs text-muted font-mono">Clusters</div>
                      <div className="text-lg font-mono text-purple-light mt-1">
                        {result.metrics.n_clusters_found}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPARE TAB ─────────────────────────────────────────────────── */}
        {tab === "compare" && (
          <div className="p-4 rounded-xl border border-border bg-surface">
            <CompareView dataset={dataset} csvData={csvData} />
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="p-4 rounded-xl border border-border bg-surface">
            <ExperimentHistory onReload={handleReloadExperiment} refreshTrigger={historyRefresh} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-[10px] font-mono text-muted">
          <span>ClusterLab v2.0 · sklearn + plotly + neon</span>
          <span>K-Means · DBSCAN · Hierarchical</span>
        </div>
      </footer>
    </div>
  );
}
