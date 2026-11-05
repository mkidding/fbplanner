import React from "react";
import { Palette } from "lucide-react";
import { PaletteSize } from "../../types/template";

interface PaletteSelectorProps {
  value: PaletteSize;
  onChange: (size: PaletteSize) => void;
}

const PALETTE_OPTIONS: { size: PaletteSize; label: string; badge?: string; desc: string }[] = [
  {
    size: 16,
    label: "16 Colors",
    desc: "4-bit retro starter palette",
  },
  {
    size: 64,
    label: "64 Colors",
    badge: "Default",
    desc: "6-bit standard universal palette",
  },
  {
    size: 256,
    label: "256 Colors",
    desc: "8-bit full universal palette",
  },
];

export const PaletteSelector: React.FC<PaletteSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          2. Universal Color Palette
        </label>
        <span className="text-[11px] font-mono text-indigo-400 font-semibold">
          {value} Colors
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PALETTE_OPTIONS.map((opt) => {
          const active = value === opt.size;
          return (
            <button
              key={opt.size}
              type="button"
              onClick={() => onChange(opt.size)}
              className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                active
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {opt.badge && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-semibold mb-0.5">
                  {opt.badge}
                </span>
              )}
              <span className="text-sm font-bold font-mono">{opt.size}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
