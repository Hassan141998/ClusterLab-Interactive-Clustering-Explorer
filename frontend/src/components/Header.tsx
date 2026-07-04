"use client";
import { Activity, Github, Cpu } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center neon-purple">
              <Cpu size={16} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Cluster<span className="text-purple-light">Lab</span>
            </h1>
            <p className="text-xs text-muted font-mono -mt-0.5">v2.0.0 · Interactive ML Explorer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <Activity size={12} className="text-neon animate-pulse-slow" />
            <span className="text-muted">sklearn</span>
            <span className="text-border">·</span>
            <span className="text-muted">plotly</span>
            <span className="text-border">·</span>
            <span className="text-muted">neon</span>
          </div>
          <a
            href="https://github.com/your-org/clusterlab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-purple-light transition-colors"
          >
            <Github size={14} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
