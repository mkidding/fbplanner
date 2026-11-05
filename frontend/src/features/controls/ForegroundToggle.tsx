import React from "react";
import { Link2, Scissors } from "lucide-react";
import { ConnectivityMetadata } from "../../types/template";

interface ForegroundToggleProps {
  extractForeground: boolean;
  onChangeExtractForeground: (extract: boolean) => void;
  connectParts: boolean;
  onChangeConnectParts: (connect: boolean) => void;
  connectivity?: ConnectivityMetadata | null;
}

export const ForegroundToggle: React.FC<ForegroundToggleProps> = ({
  extractForeground,
  onChangeExtractForeground,
  connectParts,
  onChangeConnectParts,
  connectivity,
}) => {
  return (
    <div className="space-y-2.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
        5. Background & Part Connectivity
      </label>

      {/* Background Removal Toggle */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            Remove Background
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Extracts foreground figure & auto-crops margins
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={extractForeground}
          onClick={() => onChangeExtractForeground(!extractForeground)}
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

      {/* Connect Separated Parts Toggle */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              Connect Separated Parts
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Bridges floating islands & diagonal joints into 1 piece
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={connectParts}
            onClick={() => onChangeConnectParts(!connectParts)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              connectParts ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                connectParts ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {connectivity && (
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Structural Status:</span>
            {connectivity.final_components <= 1 ? (
              <span className="font-mono text-emerald-400 font-medium">
                {connectivity.bridge_beads_added > 0
                  ? `Bridged ${connectivity.initial_components} parts (+${connectivity.bridge_beads_added} beads)`
                  : "1 Unified Piece"}
              </span>
            ) : (
              <span className="font-mono text-amber-400 font-medium">
                {connectivity.final_components} Disconnected Parts
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
