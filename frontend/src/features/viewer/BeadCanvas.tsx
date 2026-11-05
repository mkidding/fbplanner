import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  CellPixelScale,
  DisplayViewMode,
  OverlaySourceMode,
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
  overlayMode: OverlaySourceMode;
  overlayStyle: "split" | "opacity";
  overlayOpacity: number;
  overlaySplitPercent: number;
  onChangeOverlaySplitPercent: (pct: number) => void;
  rawPreviewUrl: string | null;
  extractedPreviewUrl: string | null;
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
  overlayMode,
  overlayStyle,
  overlayOpacity,
  overlaySplitPercent,
  onChangeOverlaySplitPercent,
  rawPreviewUrl,
  extractedPreviewUrl,
  canvasRef: externalRef,
}) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

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
  const renderedWidth = nativePixelWidth * displayZoom;
  const renderedHeight = nativePixelHeight * displayZoom;

  // Compute exact overlay box coordinates in screen pixels so the reference image aligns peg-for-peg
  const hasContourMargin =
    template.contour_mode === "outer-contour" &&
    template.image_size.width >= 5 &&
    template.image_size.height >= 5;
  const marginBeads = hasContourMargin ? 1 : 0;

  const overlayStartCol =
    (viewMode === "on-board" ? template.board_offset.x : 0) + marginBeads;
  const overlayStartRow =
    (viewMode === "on-board" ? template.board_offset.y : 0) + marginBeads;
  const overlayBeadCols = Math.max(1, template.image_size.width - marginBeads * 2);
  const overlayBeadRows = Math.max(1, template.image_size.height - marginBeads * 2);

  const overlayLeftPx = overlayStartCol * cellScale * displayZoom;
  const overlayTopPx = overlayStartRow * cellScale * displayZoom;
  const overlayWidthPx = overlayBeadCols * cellScale * displayZoom;
  const overlayHeightPx = overlayBeadRows * cellScale * displayZoom;

  const overlayUrl =
    overlayMode === "bg-removed"
      ? extractedPreviewUrl
      : overlayMode === "raw"
      ? rawPreviewUrl
      : null;

  const updateSplitFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relX = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, Math.round((relX / rect.width) * 100)));
      onChangeOverlaySplitPercent(pct);
    },
    [onChangeOverlaySplitPercent]
  );

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

  // Compute clip right percentage inside the overlay image box when in split mode
  const splitLinePx = (overlaySplitPercent / 100) * renderedWidth;
  const overlayVisibleWidthPx = Math.max(
    0,
    Math.min(overlayWidthPx, splitLinePx - overlayLeftPx)
  );
  const overlayClipRightPct =
    overlayWidthPx > 0
      ? Math.max(0, Math.min(100, 100 - (overlayVisibleWidthPx / overlayWidthPx) * 100))
      : 0;

  const isSplitOverlayActive = overlayUrl && overlayMode !== "none" && overlayStyle === "split";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div
        className={`relative rounded-xl p-4 border transition-colors ${
          viewMode === "on-board"
            ? "bg-slate-900/90 border-slate-700/80 shadow-2xl"
            : "bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-900/70 border-indigo-500/30 shadow-2xl"
        }`}
      >
        <div
          ref={containerRef}
          onPointerDown={(e) => {
            if (!isSplitOverlayActive) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDraggingSplit(true);
            updateSplitFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!isSplitOverlayActive || !isDraggingSplit) return;
            updateSplitFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            if (!isDraggingSplit) return;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setIsDraggingSplit(false);
          }}
          onPointerCancel={() => setIsDraggingSplit(false)}
          className={`relative select-none touch-none ${
            isSplitOverlayActive ? "cursor-ew-resize" : ""
          }`}
          style={{
            width: `${renderedWidth}px`,
            height: `${renderedHeight}px`,
          }}
        >
          <canvas
            ref={activeCanvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverInfo(null)}
            style={{
              width: `${renderedWidth}px`,
              height: `${renderedHeight}px`,
              imageRendering: "pixelated",
            }}
            className={`block rounded-sm ${
              isSplitOverlayActive ? "cursor-ew-resize" : "cursor-crosshair"
            }`}
          />

          {/* Live Reference Image Overlay aligned peg-for-peg with the generated figure */}
          {overlayUrl && overlayMode !== "none" && (
            <img
              src={overlayUrl}
              alt="Reference overlay"
              draggable={false}
              style={{
                position: "absolute",
                left: `${overlayLeftPx}px`,
                top: `${overlayTopPx}px`,
                width: `${overlayWidthPx}px`,
                height: `${overlayHeightPx}px`,
                opacity: overlayStyle === "opacity" ? overlayOpacity / 100 : 0.92,
                clipPath:
                  overlayStyle === "split"
                    ? `inset(0 ${overlayClipRightPct}% 0 0)`
                    : undefined,
              }}
              className="pointer-events-none object-fill rounded-xs select-none"
            />
          )}

          {/* Draggable Vertical Split Line on Main Canvas when Split Wipe is active */}
          {isSplitOverlayActive && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.95)] pointer-events-none"
              style={{ left: `${ overlaySplitPercent }%` }}
            >
              <div className="absolute -top-3 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                {overlaySplitPercent}%
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>
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
            <span className="text-slate-500">
              {isSplitOverlayActive
                ? "Drag the vertical divider left/right to compare"
                : "Hover over display to inspect bead coordinates"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
