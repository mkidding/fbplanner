import React from "react";
import { Scissors } from "lucide-react";

interface ForegroundToggleProps {
  extractForeground: boolean;
  onChange: (extract: boolean) => void;
}

export const ForegroundToggle: React.FC<ForegroundToggleProps> = ({
  extractForeground,
  onChange,
}) => {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Scissors className="w-3.5 h-3.5 text-indigo-400" />
          Extract Foreground Figure
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Strips background & auto-crops subject to fit the bead grid
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={extractForeground}
        onClick={() => onChange(!extractForeground)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          extractForeground ? "bg-indigo-600" : "bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
            extractForeground ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
