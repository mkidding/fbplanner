import React, { useRef } from "react";
import { ArrowRight, Eye, FolderOpen, Sparkles, Upload } from "lucide-react";
import { InspectModalTab } from "../../types/template";
import { SAMPLE_PRESETS, createSampleImageFile } from "../../utils/sampleSpriteGenerator";

interface ImageUploaderProps {
  selectedFile: File | null;
  previewUrl: string | null;
  extractedPreviewUrl?: string | null;
  extractForeground: boolean;
  onSelectFile: (file: File) => void;
  onOpenInspectModal: (initialTab: InspectModalTab) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedFile,
  previewUrl,
  extractedPreviewUrl,
  extractForeground,
  onSelectFile,
  onOpenInspectModal,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onSelectFile(file);
    }
  };

  const handleLoadSample = async (presetId: string) => {
    const sampleFile = await createSampleImageFile(presetId);
    onSelectFile(sampleFile);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          1. Raw Image & Extraction
        </label>
        {selectedFile && (
          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
            {selectedFile.name}
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-slate-700 rounded-xl p-3 transition-all bg-slate-950/60 flex flex-col items-center justify-center min-h-[136px]"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="w-full space-y-2.5">
            {/* Clickable Thumbnails that open the Inspection Pop-Up Modal */}
            <div className="flex items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => onOpenInspectModal("raw")}
                className="group/thumb flex flex-col items-center gap-1 cursor-pointer"
                title="Click to inspect full Raw Input image"
              >
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Raw upload preview"
                    className="w-16 h-16 object-contain rounded-lg bg-slate-900 border border-slate-700 group-hover/thumb:border-indigo-400 p-1 transition-colors"
                  />
                  <span className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 group-hover/thumb:text-indigo-300">
                  Raw Input
                </span>
              </button>

              {extractedPreviewUrl && (
                <>
                  <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onOpenInspectModal("bg-removed")}
                    className="group/thumb flex flex-col items-center gap-1 cursor-pointer"
                    title="Click to inspect full Background-Removed image"
                  >
                    <div className="relative">
                      <img
                        src={extractedPreviewUrl}
                        alt="Extracted foreground preview"
                        className="w-16 h-16 object-contain rounded-lg bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:8px_8px] bg-slate-900 border border-indigo-500/40 group-hover/thumb:border-indigo-400 p-1 transition-colors"
                      />
                      <span className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </span>
                    </div>
                    <span className="text-[10px] text-indigo-300 font-medium group-hover/thumb:text-indigo-200">
                      {extractForeground ? "BG Removed" : "Full Frame"}
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Action Buttons: Inspect & Compare vs Replace Image */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenInspectModal("side-by-side")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Compare / Overlay
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                Replace Image
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center text-center space-y-1.5 cursor-pointer w-full py-2"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-200">
              Drop raw image here or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-500">PNG, JPG, WEBP supported</p>
          </div>
        )}
      </div>

      {/* Quick Sample Figures */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Sample figures (with background & floating parts):</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleLoadSample(preset.id)}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] font-medium text-slate-300 transition-colors cursor-pointer truncate"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
