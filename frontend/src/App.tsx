import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { generateBeadTemplate } from "./api/templateApi";
import { ContourControls } from "./features/controls/ContourControls";
import { DimensionControls } from "./features/controls/DimensionControls";
import { ForegroundToggle } from "./features/controls/ForegroundToggle";
import { ImageUploader } from "./features/controls/ImageUploader";
import { PaletteSelector } from "./features/controls/PaletteSelector";
import { ColorBomPanel } from "./features/legend/ColorBomPanel";
import { ImageCompareModal } from "./features/viewer/ImageCompareModal";
import { TemplateViewer } from "./features/viewer/TemplateViewer";
import {
  CellPixelScale,
  ContourColorPreset,
  ContourMode,
  DisplayViewMode,
  InspectModalTab,
  PaletteSize,
  TemplateGenerateResponse,
} from "./types/template";
import { createSampleImageFile } from "./utils/sampleSpriteGenerator";

export const App: React.FC = () => {
  // Input parameters
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paletteSize, setPaletteSize] = useState<PaletteSize>(64); // Default 64 universal palette
  const [targetWidth, setTargetWidth] = useState<number>(36);
  const [targetHeight, setTargetHeight] = useState<number>(36);
  const [extractForeground, setExtractForeground] = useState<boolean>(true);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState<boolean>(true);
  const [contourMode, setContourMode] = useState<ContourMode>("outer-contour");
  const [contourColor, setContourColor] = useState<ContourColorPreset>("black");
  const [connectParts, setConnectParts] = useState<boolean>(true);

  // Display view parameters
  const [viewMode, setViewMode] = useState<DisplayViewMode>("on-board");
  const [cellScale, setCellScale] = useState<CellPixelScale>(8); // 8x8 display pixels per bead cell
  const [displayZoom, setDisplayZoom] = useState<number>(1);
  const [highlightedColorId, setHighlightedColorId] = useState<number | null>(null);

  // Inspection & Comparison Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState<boolean>(false);
  const [inspectModalTab, setInspectModalTab] = useState<InspectModalTab>("side-by-side");

  // API output state
  const [template, setTemplate] = useState<TemplateGenerateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenInspectModal = useCallback((tab: InspectModalTab) => {
    setInspectModalTab(tab);
    setInspectModalOpen(true);
  }, []);

  // Manage object URL for raw image preview
  const handleSelectFile = useCallback((file: File) => {
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  // Load initial sample figure on startup so the studio is immediately interactive
  useEffect(() => {
    let mounted = true;
    createSampleImageFile("mushroom")
      .then((file) => {
        if (mounted) {
          handleSelectFile(file);
        }
      })
      .catch(() => {
        // ignore sample initialization error
      });
    return () => {
      mounted = false;
    };
  }, [handleSelectFile]);

  // Trigger template generation automatically when file or config changes (debounced for sliders)
  useEffect(() => {
    if (!selectedFile) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setHighlightedColorId(null);

      try {
        const result = await generateBeadTemplate(selectedFile, {
          targetWidth,
          targetHeight,
          paletteSize,
          extractForeground,
          preserveAspectRatio,
          contourMode,
          contourColor,
          connectParts,
        });
        setTemplate(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate fuse bead template");
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [
    selectedFile,
    targetWidth,
    targetHeight,
    paletteSize,
    extractForeground,
    preserveAspectRatio,
    contourMode,
    contourColor,
    connectParts,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                FuseBead Studio
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  52×52 Hot Melt Board
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Background Removal • Separated-Part Bridging • Unified Contour • 16/64/256 Palette
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
            <span>Board: <strong className="text-slate-200 font-mono">52×52</strong></span>
            <span>•</span>
            <span>Default Palette: <strong className="text-indigo-300 font-mono">64 Colors</strong></span>
          </div>
        </div>
      </header>

      {/* Main Studio Grid */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Configurator (3 cols) */}
        <section className="lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
          <ImageUploader
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            extractedPreviewUrl={template?.extracted_preview_data_url}
            extractForeground={extractForeground}
            onSelectFile={handleSelectFile}
            onOpenInspectModal={handleOpenInspectModal}
          />

          <hr className="border-slate-800" />

          <PaletteSelector value={paletteSize} onChange={setPaletteSize} />

          <hr className="border-slate-800" />

          <DimensionControls
            targetWidth={targetWidth}
            targetHeight={targetHeight}
            preserveAspectRatio={preserveAspectRatio}
            onChangeWidth={setTargetWidth}
            onChangeHeight={setTargetHeight}
            onTogglePreserveAspect={setPreserveAspectRatio}
          />

          <hr className="border-slate-800" />

          <ContourControls
            contourMode={contourMode}
            contourColor={contourColor}
            onChangeMode={setContourMode}
            onChangeColor={setContourColor}
          />

          <hr className="border-slate-800" />

          <ForegroundToggle
            extractForeground={extractForeground}
            onChangeExtractForeground={setExtractForeground}
            connectParts={connectParts}
            onChangeConnectParts={setConnectParts}
            connectivity={template?.connectivity}
          />

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {selectedFile && (
            <button
              type="button"
              onClick={() => setSelectedFile(new File([selectedFile], selectedFile.name, { type: selectedFile.type }))}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Regenerate Template
            </button>
          )}
        </section>

        {/* Center Stage: Dual-Mode Local Output Display (6 cols) */}
        <section className="lg:col-span-6 h-full">
          <TemplateViewer
            template={template}
            isLoading={isLoading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            cellScale={cellScale}
            onCellScaleChange={setCellScale}
            displayZoom={displayZoom}
            onDisplayZoomChange={setDisplayZoom}
            highlightedColorId={highlightedColorId}
            rawPreviewUrl={previewUrl}
            extractedPreviewUrl={template?.extracted_preview_data_url ?? null}
            onOpenInspectModal={handleOpenInspectModal}
          />
        </section>

        {/* Right Sidebar: Bead Color BOM & Interactive Highlighter (3 cols) */}
        <section className="lg:col-span-3">
          <ColorBomPanel
            template={template}
            highlightedColorId={highlightedColorId}
            onSelectColorId={setHighlightedColorId}
          />
        </section>
      </main>

      {/* Pop-Up Modal for Inspecting Raw / BG Removed / 3-Stage Pipeline & Split Curtain Overlay */}
      <ImageCompareModal
        isOpen={inspectModalOpen}
        initialTab={inspectModalTab}
        rawPreviewUrl={previewUrl}
        extractedPreviewUrl={template?.extracted_preview_data_url ?? null}
        template={template}
        onClose={() => setInspectModalOpen(false)}
      />
    </div>
  );
};

export default App;
