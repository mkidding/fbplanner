import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Columns,
  Eye,
  GripVertical,
  Layers,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { InspectModalTab, TemplateGenerateResponse } from "../../types/template";
import { renderJustImageToCanvas } from "./renderers/renderJustImage";

interface ImageCompareModalProps {
  isOpen: boolean;
  initialTab: InspectModalTab;
  rawPreviewUrl: string | null;
  extractedPreviewUrl: string | null;
  template: TemplateGenerateResponse | null;
  onClose: () => void;
}

export const ImageCompareModal: React.FC<ImageCompareModalProps> = ({
  isOpen,
  initialTab,
  rawPreviewUrl,
  extractedPreviewUrl,
  template,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<InspectModalTab>(initialTab);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [ isDraggingCurtain, setIsDraggingCurtain ] = useState<boolean>(false);
  const [blendOpacity, setBlendOpacity] = useState<number>(45);
  const [compareMode, setCompareMode] = useState<"curtain" | "opacity">("curtain");
  const [compareRefSource, setCompareRefSource] = useState<"bg-removed" | "raw">(
    "bg-removed"
  );

  const sideBySideCanvasRef = useRef<HTMLCanvasElement>(null);
  const splitCanvasRef = useRef<HTMLCanvasElement>(null);
  const splitStageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Render the Fuse Bead output canvas inside the modal whenever open/tab changes
  useEffect(() => {
    if (!isOpen || !template) return;

    if (activeTab === "side-by-side" && sideBySideCanvasRef.current) {
      const ctx = sideBySideCanvasRef.current.getContext("2d");
      if (ctx) {
        renderJustImageToCanvas(ctx, template, 8, null);
      }
    }
    if (activeTab === "split-curtain" && splitCanvasRef.current) {
      const ctx = splitCanvasRef.current.getContext("2d");
      if (ctx) {
        renderJustImageToCanvas(ctx, template, 8, null);
      }
    }
  }, [isOpen, activeTab, template]);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const stage = splitStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, Math.round(rawPct)));
    setSplitPercent(clamped);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeReferenceUrl =
    compareRefSource === "bg-removed" && extractedPreviewUrl
      ? extractedPreviewUrl
      : rawPreviewUrl;

  // Compute inner bounding box percentages when the outer contour adds a 1-bead margin
  const hasContourMargin =
    template &&
    template.contour_mode === "outer-contour" &&
    template.image_size.width >= 5 &&
    template.image_size.height >= 5;

  const padPctX =
    hasContourMargin && template ? (1 / template.image_size.width) * 100 : 0;
  const padPctY =
    hasContourMargin && template ? (1 / template.image_size.height) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              Image Inspection & Pipeline Comparison
            </h2>
            <p className="text-xs text-slate-400">
              Inspect Raw Input, Background-Removed Subject, and Fuse Bead Output side-by-side or overlaid
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("side-by-side")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "side-by-side"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                3-Stage Pipeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("split-curtain")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "split-curtain"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Overlay / Split Compare
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "raw"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Raw Input
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bg-removed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "bg-removed"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                BG Removed
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "side-by-side" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {/* Stage 1: Raw Input */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    1. Raw Input Image
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Original</span>
                </div>
                <div className="flex-1 flex items-center justify-center w-full min-h-[260px] bg-slate-900/80 rounded-xl p-3 border border-slate-800/80">
                  {rawPreviewUrl ? (
                    <img
                      src={rawPreviewUrl}
                      alt="Raw input"
                      className="max-h-[260px] max-w-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No image</span>
                  )}
                </div>
              </div>

              {/* Stage 2: Background Removed */}
              <div className="bg-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    2. Background Removed
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono">
                    Auto-Cropped RGBA
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center w-full min-h-[260px] bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:12px_12px] bg-slate-900 rounded-xl p-3 border border-slate-800/80">
                  {extractedPreviewUrl ? (
                    <img
                      src={extractedPreviewUrl}
                      alt="Extracted foreground"
                      className="max-h-[260px] max-w-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No preview</span>
                  )}
                </div>
              </div>

              {/* Stage 3: Fuse Bead Output */}
              <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    3. Fuse Bead Output
                  </span>
                  {template && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {template.image_size.width}×{template.image_size.height} ({template.total_beads} beads)
                    </span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center w-full min-h-[260px] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-900 rounded-xl p-3 border border-slate-800/80">
                  {template ? (
                    <canvas
                      ref={sideBySideCanvasRef}
                      style={{ imageRendering: "pixelated" }}
                      className="max-h-[260px] max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Generating...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "split-curtain" && template && (
            <div className="flex flex-col items-center space-y-5">
              {/* Controls bar for Overlay / Split Compare */}
              <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-xl w-full max-w-2xl">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium">Compare Mode:</span>
                  <button
                    type="button"
                    onClick={() => setCompareMode("curtain")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      compareMode === "curtain"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Split Curtain Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode("opacity")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      compareMode === "opacity"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Alpha Overlay Blend
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Reference:</span>
                  <button
                    type="button"
                    onClick={() => setCompareRefSource("bg-removed")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      compareRefSource === "bg-removed"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    BG Removed
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareRefSource("raw")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      compareRefSource === "raw"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    Raw Image
                  </button>
                </div>
              </div>

              {/* Interactive Comparison Stage (Draggable Left-Right in Curtain Mode) */}
              <div
                className="relative bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 border border-slate-700 rounded-2xl p-6 flex items-center justify-center select-none"
                style={{ minHeight: "380px" }}
              >
                <div
                  ref={splitStageRef}
                  onPointerDown={(e) => {
                    if (compareMode !== "curtain") return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setIsDraggingCurtain(true);
                    updateSplitFromClientX(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (compareMode !== "curtain" || !isDraggingCurtain) return;
                    updateSplitFromClientX(e.clientX);
                  }}
                  onPointerUp={(e) => {
                    if (!isDraggingCurtain) return;
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    setIsDraggingCurtain(false);
                  }}
                  onPointerCancel={() => setIsDraggingCurtain(false)}
                  className={`relative inline-block touch-none ${
                    compareMode === "curtain" ? "cursor-ew-resize" : ""
                  }`}
                  style={{
                    width: `${template.image_size.width * 10}px`,
                    height: `${template.image_size.height * 10}px`,
                  }}
                >
                  {/* Base Layer: Generated Fuse Bead Canvas */}
                  <canvas
                    ref={splitCanvasRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "pixelated",
                    }}
                    className="block pointer-events-none"
                  />

                  {/* Top Layer: Reference Image (aligned with inner subject box when outer-contour is active) */}
                  {activeReferenceUrl && (
                    <div
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      style={
                        compareMode === "curtain"
                          ? { clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }
                          : { opacity: blendOpacity / 100 }
                      }
                    >
                      <img
                        src={activeReferenceUrl}
                        alt="Reference overlay"
                        draggable={false}
                        style={{
                          position: "absolute",
                          left: `${padPctX}%`,
                          top: `${padPctY}%`,
                          width: `${100 - padPctX * 2}%`,
                          height: `${100 - padPctY * 2}%`,
                        }}
                        className="object-fill select-none"
                      />
                    </div>
                  )}

                  {/* Draggable Vertical Split Curtain Divider Line + Center Handle */}
                  {compareMode === "curtain" && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.95)] pointer-events-none"
                      style={{ left: `${splitPercent}%` }}
                    >
                      {/* Top percentage badge */}
                      <div className="absolute -top-3.5 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                        {splitPercent}%
                      </div>

                      {/* Center Grab Handle Pill */}
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Slider Input */}
              <div className="w-full max-w-md bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 space-y-1.5">
                {compareMode === "curtain" ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>← Reference ({compareRefSource === "bg-removed" ? "BG Removed" : "Raw"})</span>
                      <span className="font-mono text-indigo-400">
                        Drag divider or slider ({splitPercent}%)
                      </span>
                      <span>Fuse Bead Output →</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitPercent}
                      onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>0% (Pure Fuse Beads)</span>
                      <span className="font-mono text-indigo-400">
                        Overlay Opacity: {blendOpacity}%
                      </span>
                      <span>100% (Reference)</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={blendOpacity}
                      onChange={(e) => setBlendOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="flex flex-col items-center justify-center min-h-[420px] bg-slate-950 border border-slate-800 rounded-2xl p-6">
              {rawPreviewUrl ? (
                <img
                  src={rawPreviewUrl}
                  alt="Raw input full preview"
                  className="max-h-[460px] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <span className="text-sm text-slate-500">No raw image loaded</span>
              )}
            </div>
          )}

          {activeTab === "bg-removed" && (
            <div className="flex flex-col items-center justify-center min-h-[420px] bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:14px_14px] bg-slate-950 border border-slate-800 rounded-2xl p-6">
              {extractedPreviewUrl ? (
                <img
                  src={extractedPreviewUrl}
                  alt="Background removed full preview"
                  className="max-h-[460px] max-w-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-sm text-slate-500">No extracted preview available</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
