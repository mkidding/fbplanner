import React, { useRef } from "react";
import { ArrowRight, Sparkles, Upload } from "lucide-react";
import { SAMPLE_PRESETS, createSampleImageFile } from "../../utils/sampleSpriteGenerator";

interface ImageUploaderProps {
  selectedFile: File | null;
  previewUrl: string | null;
  extractedPreviewUrl?: string | null;
  extractForeground: boolean;
  onSelectFile: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedFile,
  previewUrl,
  extractedPreviewUrl,
  extractForeground,
  onSelectFile,
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
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="group relative border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-xl p-3 transition-all bg-slate-950/60 hover:bg-slate-900/80 cursor-pointer flex flex-col items-center justify-center min-h-[128px]"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2.5 w-full">
              {/* Raw Input Thumbnail */}
              <div className="flex flex-col items-center gap-1">
                <img
                  src={previewUrl}
                  alt="Raw upload preview"
                  className="w-16 h-16 object-contain rounded-lg bg-slate-900 border border-slate-800 p-1"
                />
                <span className="text-[10px] text-slate-400">Raw Input</span>
              </div>

              {extractedPreviewUrl && (
                <>
                  <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                  {/* Extracted Foreground Thumbnail on Checkerboard */}
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={extractedPreviewUrl}
                      alt="Extracted foreground preview"
                      className="w-16 h-16 object-contain rounded-lg bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:8px_8px] bg-slate-900 border border-indigo-500/40 p-1"
                    />
                    <span className="text-[10px] text-indigo-300 font-medium">
                      {extractForeground ? "BG Removed" : "Full Frame"}
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-500">
              Click or drop another image to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
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
