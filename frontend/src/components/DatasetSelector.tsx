"use client";
import { useState, useRef } from "react";
import { Upload, Database, ChevronDown, FileText, Check } from "lucide-react";
import { uploadCSV } from "@/lib/api";
import type { Dataset } from "@/types";

const BUILT_IN_DATASETS: { id: Dataset; name: string; desc: string; tags: string[] }[] = [
  { id: "iris", name: "Iris", desc: "4-feature flower dataset (150 samples)", tags: ["classic", "4D"] },
  { id: "blobs", name: "Blobs", desc: "Well-separated Gaussian clusters", tags: ["synthetic", "2D"] },
  { id: "moons", name: "Moons", desc: "Two interleaving half-circles", tags: ["nonlinear", "2D"] },
  { id: "circles", name: "Circles", desc: "Concentric circle rings", tags: ["nonlinear", "2D"] },
  { id: "mall", name: "Mall Customers", desc: "Income vs spending score", tags: ["real-world", "2D"] },
  { id: "wholesale", name: "Wholesale", desc: "Product category spending (4D)", tags: ["real-world", "4D"] },
];

interface Props {
  selected: Dataset;
  onSelect: (ds: Dataset) => void;
  onCSVLoad: (csvData: string, filename: string) => void;
  csvFilename: string | null;
}

export default function DatasetSelector({ selected, onSelect, onCSVLoad, csvFilename }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setUploadError("Only CSV files are supported");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadCSV(file);
      onCSVLoad(result.csv_data, file.name);
      onSelect("csv");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Database size={14} className="text-purple-light" />
        <span className="text-xs font-mono text-muted uppercase tracking-widest">Dataset</span>
      </div>

      {/* Built-in grid */}
      <div className="grid grid-cols-2 gap-2">
        {BUILT_IN_DATASETS.map((ds) => (
          <button
            key={ds.id}
            onClick={() => onSelect(ds.id)}
            className={`text-left p-3 rounded-lg border transition-all ${
              selected === ds.id
                ? "border-purple bg-purple/10 shadow-neon-purple"
                : "border-border bg-surface2 hover:border-purple/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">{ds.name}</span>
              {selected === ds.id && <Check size={12} className="text-neon" />}
            </div>
            <p className="text-xs text-muted leading-tight">{ds.desc}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {ds.tags.map((t) => (
                <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-border text-muted">
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* CSV Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all text-center ${
          dragOver
            ? "border-purple bg-purple/10"
            : selected === "csv"
            ? "border-neon/60 bg-neon/5"
            : "border-border hover:border-purple/50"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-purple-light">
            <div className="w-4 h-4 border-2 border-purple-light border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-mono">Parsing CSV…</span>
          </div>
        ) : csvFilename && selected === "csv" ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={14} className="text-neon" />
            <span className="text-sm text-neon font-mono">{csvFilename}</span>
            <Check size={12} className="text-neon" />
          </div>
        ) : (
          <div>
            <Upload size={20} className="mx-auto mb-1 text-muted" />
            <p className="text-sm text-muted">
              Drop CSV or <span className="text-purple-light">click to upload</span>
            </p>
            <p className="text-xs text-muted/60 mt-1">Requires ≥2 numeric columns</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-red-400 font-mono bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
          ⚠ {uploadError}
        </p>
      )}
    </div>
  );
}
