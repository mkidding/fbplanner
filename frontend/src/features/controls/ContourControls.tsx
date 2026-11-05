import React from "react";
import { ShieldCheck } from "lucide-react";
import { ContourColorPreset, ContourMode } from "../../types/template";

interface ContourControlsProps {
  contourMode: ContourMode;
  contourColor: ContourColorPreset;
  onChangeMode: (mode: ContourMode) => void;
  onChangeColor: (color: ContourColorPreset) => void;
}

const MODE_OPTIONS: { mode: ContourMode; label: string; desc: string }[] = [
  {
    mode: "outer-contour",
    label: "Outer Contour",
    desc: "Smooths silhouette & wraps a continuous 1-bead outline outside the figure",
  },
  {
    mode: "unify-edge",
    label: "Unify Edge",
    desc: "Replaces the figure's perimeter beads with one unified border color",
  },
  {
    mode: "none",
    label: "Raw Edge",
    desc: "No unified border (original quantized edge colors)",
  },
];

const COLOR_OPTIONS: { preset: ContourColorPreset; label: string; swatch: string }[] = [
  { preset: "black", label: "Black (#000)", swatch: "#000000" },
  { preset: "auto-dark", label: "Auto Darkest", swatch: "#1e293b" },
  { preset: "white", label: "White (#FFF)", swatch: "#ffffff" },
];

export const ContourControls: React.FC<ContourControlsProps> = ({
  contourMode,
  contourColor,
  onChangeMode,
  onChangeColor,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          4. Unified Border & Contour
        </label>
        <span className="text-[11px] font-mono text-indigo-400">
          {contourMode === "none" ? "Off" : "Active"}
        </span>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {MODE_OPTIONS.map((opt) => {
          const active = contourMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => onChangeMode(opt.mode)}
              title={opt.desc}
              className={`px-2 py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                active
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-xs"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Unified Contour Color Selector (shown when border unification is active) */}
      {contourMode !== "none" && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Unified Contour Color:</span>
            <span className="text-[10px] text-slate-500">Denoises inner edge fringe</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {COLOR_OPTIONS.map((c) => {
              const active = contourColor === c.preset;
              return (
                <button
                  key={c.preset}
                  type="button"
                  onClick={() => onChangeColor(c.preset)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-200"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: c.swatch }}
                  />
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
