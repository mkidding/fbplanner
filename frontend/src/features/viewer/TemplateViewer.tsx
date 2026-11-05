import React, { useRef } from "react";
import { Download, Grid, Image as ImageIcon, Maximize2 } from "lucide-react";
import {
  CellPixelScale,
  DisplayViewMode,
  TemplateGenerateResponse,
} from "../../types/template";
import { BeadCanvas } from "./BeadCanvas";

interface TemplateViewerProps {
  template: TemplateGenerateResponse | null;
  isLoading: boolean;
  viewMode: DisplayViewMode;
  onViewModeChange: (mode: DisplayViewMode) => void;
  cellScale: CellPixelScale;
  onCellScaleChange: (scale: CellPixelScale) => void;
  displayZoom: number;
  onDisplayZoomChange: (zoom: number) => void;
  highlightedColorId: number | null;
}

export const TemplateViewer: React.FC<TemplateViewerProps> = ({
  template,
  isLoading,
  viewMode,
  onViewModeChange,
  cellScale,
  onCellScaleChange,
  displayZoom,
  onDisplayZoomChange,
  highlightedColorId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `fusebead-${viewMode}-${template.image_size.width}x${template.image_size.height}-${template.palette_size}c.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Top Toolbar: View Toggle ("On-Board" vs "Just Image") + Pixel Cell Mapping */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
        {/* Primary Display Mode Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onViewModeChange("on-board")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "on-board"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            On-Board (52×52 Pegboard)
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("just-image")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "just-image"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Just Image (Fused Bead View)
          </button>
        </div>

        {/* Sub-pixel Bead Block Size & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 4x4 vs 8x8 Display Pixels per Bead */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Bead Sprite:</span>
            {([4, 8] as CellPixelScale[]).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => onCellScaleChange(scale)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  cellScale === scale
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {scale}×{scale}px
              </button>
            ))}
          </div>

          {/* 1x (True 1:1 display pixel) / 2x / 3x Zoom */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <Maximize2 className="w-3 h-3 text-slate-400 mr-1" />
            {[1, 2, 3].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => onDisplayZoomChange(z)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  displayZoom === z
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {z}×
              </button>
            ))}
          </div>

          {template && (
            <button
              type="button"
              onClick={handleExportPng}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              title="Download rendered output as PNG"
            >
              <Download className="w-3.5 h-3.5" />
              Export PNG
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto min-h-[480px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-10 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-indigo-200">
              Extracting foreground & quantizing fuse bead matrix...
            </p>
          </div>
        )}

        {template ? (
          <BeadCanvas
            template={template}
            viewMode={viewMode}
            cellScale={cellScale}
            displayZoom={displayZoom}
            highlightedColorId={highlightedColorId}
            canvasRef={canvasRef}
          />
        ) : (
          <div className="text-center max-w-md space-y-3 py-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <Grid className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              Ready to Create Your 52×52 Fuse Bead Template
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload any image or load a sample figure from the left panel. Toggle between{" "}
              <span className="text-slate-200 font-medium">On-Board (52×52 Pegboard)</span> and{" "}
              <span className="text-slate-200 font-medium">Just Image (Fused Bead View)</span> with
              rounded-corner 4×4 or 8×8 pixel bead sprites.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
