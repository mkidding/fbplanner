export type PaletteSize = 16 | 64 | 256;

export type DisplayViewMode = "on-board" | "just-image";

export type CellPixelScale = 4 | 8;

export type ContourMode = "outer-contour" | "unify-edge" | "none";

export type ContourColorPreset = "black" | "auto-dark" | "white";

export type OverlaySourceMode = "none" | "bg-removed" | "raw";

export type InspectModalTab = "side-by-side" | "split-curtain" | "raw" | "bg-removed";

export interface Dimensions {
  width: number;
  height: number;
}

export interface BoardOffset {
  x: number;
  y: number;
}

export interface PaletteColorUsage {
  id: number;
  name: string;
  hex: string;
  rgb: [number, number, number];
  count: number;
}

export interface ConnectivityMetadata {
  connect_parts_enabled: boolean;
  initial_components: number;
  final_components: number;
  bridge_beads_added: number;
}

export interface TemplateGenerateResponse {
  board_size: Dimensions;
  requested_size: Dimensions;
  image_size: Dimensions;
  board_offset: BoardOffset;
  palette_size: PaletteSize;
  extract_foreground: boolean;
  preserve_aspect_ratio: boolean;
  contour_mode: ContourMode;
  contour_color: ContourColorPreset;
  connectivity: ConnectivityMetadata;
  extracted_preview_data_url?: string | null;
  total_beads: number;
  unique_colors_used: number;
  palette_usage: PaletteColorUsage[];
  color_lookup: Record<number, string>;
  grid: (number | null)[][];
}

export interface TemplateConfigParams {
  targetWidth: number;
  targetHeight: number;
  paletteSize: PaletteSize;
  extractForeground: boolean;
  preserveAspectRatio: boolean;
  contourMode: ContourMode;
  contourColor: ContourColorPreset;
  connectParts: boolean;
}
