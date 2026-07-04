"use client";
import { useState } from "react";
import { Sliders, Info } from "lucide-react";
import type { Algorithm, KMeansParams, DBSCANParams, HierarchicalParams } from "@/types";

// ─── Shared slider ──────────────────────────────────────────────────────────
function ParamSlider({
  label, value, min, max, step, onChange, tooltip, mono = true,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; tooltip?: string; mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">{label}</span>
          {tooltip && (
            <div className="group relative">
              <Info size={10} className="text-muted/50 cursor-help" />
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 text-xs bg-surface border border-border rounded p-2 text-muted z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span className={`text-xs font-mono text-purple-light ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted/50 font-mono">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────────────────
function ParamSelect<T extends string>({
  label, value, options, onChange,
}: {
  label: string; value: T; options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm font-mono text-text focus:border-purple focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── K-Means params ─────────────────────────────────────────────────────────
function KMeansPanel({ params, onChange }: { params: KMeansParams; onChange: (p: KMeansParams) => void }) {
  return (
    <div className="space-y-4">
      <ParamSlider
        label="n_clusters (K)" value={params.n_clusters}
        min={2} max={12} step={1}
        tooltip="Number of clusters to form. Use Elbow Method to find optimal K."
        onChange={(v) => onChange({ ...params, n_clusters: v })}
      />
      <ParamSelect
        label="init"
        value={params.init}
        options={[
          { value: "k-means++", label: "k-means++ (smart init)" },
          { value: "random", label: "random" },
        ]}
        onChange={(v) => onChange({ ...params, init: v })}
      />
      <ParamSlider
        label="max_iter" value={params.max_iter}
        min={50} max={600} step={50}
        tooltip="Maximum iterations for convergence."
        onChange={(v) => onChange({ ...params, max_iter: v })}
      />
      <div className="terminal-box p-3 text-[11px] font-mono space-y-1 text-muted">
        <div><span className="text-purple-light">KMeans</span>(</div>
        <div className="pl-4">n_clusters=<span className="text-neon">{params.n_clusters}</span>,</div>
        <div className="pl-4">init=<span className="text-neon">"{params.init}"</span>,</div>
        <div className="pl-4">max_iter=<span className="text-neon">{params.max_iter}</span>,</div>
        <div className="pl-4">random_state=<span className="text-neon">42</span></div>
        <div>)</div>
      </div>
    </div>
  );
}

// ─── DBSCAN params ──────────────────────────────────────────────────────────
function DBSCANPanel({ params, onChange }: { params: DBSCANParams; onChange: (p: DBSCANParams) => void }) {
  return (
    <div className="space-y-4">
      <ParamSlider
        label="eps (ε)" value={params.eps}
        min={0.05} max={3.0} step={0.05}
        tooltip="Maximum distance between two samples to be considered neighbors."
        onChange={(v) => onChange({ ...params, eps: v })}
      />
      <ParamSlider
        label="min_samples" value={params.min_samples}
        min={2} max={30} step={1}
        tooltip="Minimum samples in a neighborhood for a core point."
        onChange={(v) => onChange({ ...params, min_samples: v })}
      />
      <div className="terminal-box p-3 text-[11px] font-mono space-y-1 text-muted">
        <div><span className="text-purple-light">DBSCAN</span>(</div>
        <div className="pl-4">eps=<span className="text-neon">{params.eps}</span>,</div>
        <div className="pl-4">min_samples=<span className="text-neon">{params.min_samples}</span>,</div>
        <div className="pl-4">algorithm=<span className="text-neon">"auto"</span></div>
        <div>)</div>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 font-mono">
        <span className="font-semibold">Tip:</span> Noise points (label=-1) shown in gray.
        Low eps → more noise. High eps → fewer clusters.
      </div>
    </div>
  );
}

// ─── Hierarchical params ────────────────────────────────────────────────────
function HierarchicalPanel({ params, onChange }: { params: HierarchicalParams; onChange: (p: HierarchicalParams) => void }) {
  return (
    <div className="space-y-4">
      <ParamSlider
        label="n_clusters" value={params.n_clusters}
        min={2} max={12} step={1}
        tooltip="Number of clusters to cut the dendrogram at."
        onChange={(v) => onChange({ ...params, n_clusters: v })}
      />
      <ParamSelect
        label="linkage"
        value={params.linkage}
        options={[
          { value: "ward", label: "ward (minimize variance)" },
          { value: "complete", label: "complete (max distance)" },
          { value: "average", label: "average (mean distance)" },
          { value: "single", label: "single (min distance)" },
        ]}
        onChange={(v) => onChange({ ...params, linkage: v })}
      />
      <div className="terminal-box p-3 text-[11px] font-mono space-y-1 text-muted">
        <div><span className="text-purple-light">AgglomerativeClustering</span>(</div>
        <div className="pl-4">n_clusters=<span className="text-neon">{params.n_clusters}</span>,</div>
        <div className="pl-4">linkage=<span className="text-neon">"{params.linkage}"</span></div>
        <div>)</div>
      </div>
      <div className="bg-purple/10 border border-purple/20 rounded-lg p-3 text-xs text-purple-light font-mono">
        <span className="font-semibold">ward</span> works best for compact clusters.
        <span className="font-semibold"> single</span> can find elongated shapes.
      </div>
    </div>
  );
}

// ─── Tabs wrapper ────────────────────────────────────────────────────────────
const ALGO_TABS: { id: Algorithm; label: string; short: string }[] = [
  { id: "kmeans", label: "K-Means", short: "KM" },
  { id: "dbscan", label: "DBSCAN", short: "DB" },
  { id: "hierarchical", label: "Hierarchical", short: "HC" },
];

interface Props {
  algorithm: Algorithm;
  onAlgorithmChange: (a: Algorithm) => void;
  kmeansParams: KMeansParams;
  dbscanParams: DBSCANParams;
  hierarchicalParams: HierarchicalParams;
  onKMeansChange: (p: KMeansParams) => void;
  onDBSCANChange: (p: DBSCANParams) => void;
  onHierarchicalChange: (p: HierarchicalParams) => void;
}

export default function AlgorithmParams({
  algorithm, onAlgorithmChange,
  kmeansParams, dbscanParams, hierarchicalParams,
  onKMeansChange, onDBSCANChange, onHierarchicalChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sliders size={14} className="text-purple-light" />
        <span className="text-xs font-mono text-muted uppercase tracking-widest">Algorithm</span>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-surface2 p-1 border border-border gap-1">
        {ALGO_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onAlgorithmChange(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-mono transition-all ${
              algorithm === t.id
                ? "bg-purple text-white shadow-neon-purple"
                : "text-muted hover:text-text"
            }`}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
          </button>
        ))}
      </div>

      {/* Param panels */}
      <div className="animate-fade-in">
        {algorithm === "kmeans" && (
          <KMeansPanel params={kmeansParams} onChange={onKMeansChange} />
        )}
        {algorithm === "dbscan" && (
          <DBSCANPanel params={dbscanParams} onChange={onDBSCANChange} />
        )}
        {algorithm === "hierarchical" && (
          <HierarchicalPanel params={hierarchicalParams} onChange={onHierarchicalChange} />
        )}
      </div>
    </div>
  );
}
