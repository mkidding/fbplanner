import React from "react";
import { Eye, Layers } from "lucide-react";
import { TemplateGenerateResponse } from "../../types/template";

interface ColorBomPanelProps {
  template: TemplateGenerateResponse | null;
  highlightedColorId: number | null;
  onSelectColorId: (id: number | null) => void;
}

export const ColorBomPanel: React.FC<ColorBomPanelProps> = ({
  template,
  highlightedColorId,
  onSelectColorId,
}) => {
  if (!template) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
        <Layers className="w-6 h-6 text-slate-500 mx-auto" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Bead Color Inventory
        </h3>
        <p className="text-xs text-slate-500">
          Generate a template to inspect used palette colors and exact bead counts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col h-full max-h-[680px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Bead Bill of Materials
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click a color to isolate its pegs on the board
          </p>
        </div>
        {highlightedColorId !== null && (
          <button
            type="button"
            onClick={() => onSelectColorId(null)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
          >
            Show All
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 my-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
          <div className="text-[10px] uppercase text-slate-400">Total Beads</div>
          <div className="text-sm font-bold font-mono text-white mt-0.5">
            {template.total_beads.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
          <div className="text-[10px] uppercase text-slate-400">Active Colors</div>
          <div className="text-sm font-bold font-mono text-indigo-400 mt-0.5">
            {template.unique_colors_used} / {template.palette_size}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
          <div className="text-[10px] uppercase text-slate-400">Output Grid</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            {template.image_size.width}×{template.image_size.height}
          </div>
        </div>
      </div>

      {/* Scrollable Color List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {template.palette_usage.map((item) => {
          const isSelected = highlightedColorId === item.id;
          const pct =
            template.total_beads > 0
              ? ((item.count / template.total_beads) * 100).toFixed(1)
              : "0.0";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectColorId(isSelected ? null : item.id)}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 text-white"
                  : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-5 h-5 rounded-md border border-white/20 shrink-0 shadow-xs"
                  style={{ backgroundColor: item.hex }}
                />
                <div className="truncate">
                  <div className="text-xs font-mono font-semibold text-slate-200">
                    {item.hex}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    ID #{item.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-100">
                    {item.count} <span className="text-[10px] font-normal text-slate-400">beads</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{pct}%</div>
                </div>
                <Eye
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-indigo-400" : "text-slate-600"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
