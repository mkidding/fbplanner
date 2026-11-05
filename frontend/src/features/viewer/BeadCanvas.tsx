import React, { useEffect, useRef, useState } from "react";
import {
  CellPixelScale,
  DisplayViewMode,
  PaletteColorUsage,
  TemplateGenerateResponse,
} from "../../types/template";
import { renderJustImageToCanvas } from "./renderers/renderJustImage";
import { renderOnBoardToCanvas } from "./renderers/renderOnBoard";

interface BeadCanvasProps {
  template: TemplateGenerateResponse;
  viewMode: DisplayViewMode;
  cellScale: CellPixelScale;
  displayZoom: number;
  highlightedColorId: number | null;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

interface HoverInfo {
  col: number;
  row: number;
  color: PaletteColorUsage | null;
}

export const BeadCanvas: React.FC<BeadCanvasProps> = ({
  template,
  viewMode,
  cellScale,
  displayZoom,
  highlightedColorId,
  canvasRef: externalRef,
}) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = externalRef ?? internalRef;
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const usageById = React.useMemo(() => {
    const map = new Map<number, PaletteColorUsage>();
    for (const item of template.palette_usage) {
      map.set(item.id, item);
    }
    return map;
  }, [template.palette_usage]);

  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (viewMode === "on-board") {
      renderOnBoardToCanvas(ctx, template, cellScale, highlightedColorId);
    } else {
      renderJustImageToCanvas(ctx, template, cellScale, highlightedColorId);
    }
  }, [template, viewMode, cellScale, highlightedColorId, activeCanvasRef]);

  const gridCols =
    viewMode === "on-board" ? template.board_size.width : template.image_size.width;
  const gridRows =
    viewMode === "on-board" ? template.board_size.height : template.image_size.height;

  const nativePixelWidth = gridCols * cellScale;
  const nativePixelHeight = gridRows * cellScale;

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const col = Math.floor((relX / rect.width) * gridCols);
    const row = Math.floor((relY / rect.height) * gridRows);

    if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) {
      setHoverInfo(null);
      return;
    }

    let colorId: number | null = null;
    if (viewMode === "on-board") {
      const imgCol = col - template.board_offset.x;
      const imgRow = row - template.board_offset.y;
      if (
        imgCol >= 0 &&
        imgCol < template.image_size.width &&
        imgRow >= 0 &&
        imgRow < template.image_size.height
      ) {
        colorId = template.grid[imgRow]?.[imgCol] ?? null;
      }
    } else {
      colorId = template.grid[row]?.[col] ?? null;
    }

    setHoverInfo({
      col: col + 1,
      row: row + 1,
      color: colorId !== null ? usageById.get(colorId) ?? null : null,
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div
        className={`relative rounded-xl p-4 border transition-colors ${
          viewMode === "on-board"
            ? "bg-slate-900/90 border-slate-700/80 shadow-2xl"
            : "bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-900/70 border-indigo-500/30 shadow-2xl"
        }`}
      >
        <canvas
          ref={activeCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          style={{
            width: `${nativePixelWidth * displayZoom}px`,
            height: `${nativePixelHeight * displayZoom}px`,
            imageRendering: "pixelated",
          }}
          className="block cursor-crosshair rounded-sm"
        />
      </div>

      {/* Bottom status / hover bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 w-full px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300">
            Canvas: {nativePixelWidth}×{nativePixelHeight}px
          </span>
          <span>•</span>
          <span>
            1 bead = {cellScale}×{cellScale} display px
          </span>
          {displayZoom > 1 && (
            <>
              <span>•</span>
              <span className="text-indigo-400 font-medium">{displayZoom}× magnification</span>
            </>
          )}
        </div>

        <div className="h-5 flex items-center">
          {hoverInfo ? (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 rounded-full">
              <span className="font-mono text-slate-300">
                Peg ({hoverInfo.col}, {hoverInfo.row})
              </span>
              {hoverInfo.color ? (
                <>
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 inline-block"
                    style={{ backgroundColor: hoverInfo.color.hex }}
                  />
                  <span className="text-slate-200 font-medium">
                    {hoverInfo.color.hex}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic">Empty peg</span>
              )}
            </div>
          ) : (
            <span className="text-slate-500">Hover over display to inspect bead coordinates</span>
          )}
        </div>
      </div>
    </div>
  );
};
