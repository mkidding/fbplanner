import React from "react";
import { Lock, Maximize, Unlock } from "lucide-react";

interface DimensionControlsProps {
  targetWidth: number;
  targetHeight: number;
  preserveAspectRatio: boolean;
  onChangeWidth: (width: number) => void;
  onChangeHeight: (height: number) => void;
  onTogglePreserveAspect: (preserve: boolean) => void;
}

const MAX_BOARD_DIM = 52;
const QUICK_PRESETS = [24, 36, 48, 52];

export const DimensionControls: React.FC<DimensionControlsProps> = ({
  targetWidth,
  targetHeight,
  preserveAspectRatio,
  onChangeWidth,
  onChangeHeight,
  onTogglePreserveAspect,
}) => {
  const clamp = (val: number) => Math.max(1, Math.min(MAX_BOARD_DIM, val || 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Maximize className="w-3.5 h-3.5 text-indigo-400" />
          3. Output Bead Size (Max 52×52)
        </label>
        <span className="text-[11px] font-mono text-slate-400">
          Board: 52×52
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Width (Beads)</span>
            <span className="font-mono text-slate-200">{targetWidth}</span>
          </div>
          <input
            type="number"
            min={1}
            max={MAX_BOARD_DIM}
            value={targetWidth}
            onChange={(e) => onChangeWidth(clamp(parseInt(e.target.value, 10)))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="range"
            min={8}
            max={MAX_BOARD_DIM}
            value={targetWidth}
            onChange={(e) => onChangeWidth(clamp(parseInt(e.target.value, 10)))}
            className="w-full mt-2 accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Height (Beads)</span>
            <span className="font-mono text-slate-200">{targetHeight}</span>
          </div>
          <input
            type="number"
            min={1}
            max={MAX_BOARD_DIM}
            value={targetHeight}
            onChange={(e) => onChangeHeight(clamp(parseInt(e.target.value, 10)))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="range"
            min={8}
            max={MAX_BOARD_DIM}
            value={targetHeight}
            onChange={(e) => onChangeHeight(clamp(parseInt(e.target.value, 10)))}
            className="w-full mt-2 accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Quick size presets & Aspect ratio toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {QUICK_PRESETS.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => {
                onChangeWidth(dim);
                onChangeHeight(dim);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                targetWidth === dim && targetHeight === dim
                  ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {dim}×{dim}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onTogglePreserveAspect(!preserveAspectRatio)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
            preserveAspectRatio
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
          title="Keep original figure proportions inside target Width × Height"
        >
          {preserveAspectRatio ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
          Fit Aspect
        </button>
      </div>
    </div>
  );
};
