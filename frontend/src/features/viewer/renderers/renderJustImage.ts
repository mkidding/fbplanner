import { CellPixelScale, TemplateGenerateResponse } from "../../../types/template";
import {
  FUSED_BEAD_MASK_4X4,
  FUSED_BEAD_MASK_8X8,
  adjustRgbLuminance,
  hexToRgb,
} from "./beadSpriteMasks";

/**
 * Renders the "Just Image" post-creation fused bead view (WxH beads)
 * where each generated bead maps to a 4x4 or 8x8 block of display pixels
 * with rounded corners and subtle fused surface shading.
 */
export function renderJustImageToCanvas(
  ctx: CanvasRenderingContext2D,
  template: TemplateGenerateResponse,
  cellScale: CellPixelScale,
  highlightedColorId: number | null = null
): void {
  const imgW = template.image_size.width;
  const imgH = template.image_size.height;
  const canvasW = imgW * cellScale;
  const canvasH = imgH * cellScale;

  if (ctx.canvas.width !== canvasW || ctx.canvas.height !== canvasH) {
    ctx.canvas.width = canvasW;
    ctx.canvas.height = canvasH;
  }

  const imgData = ctx.createImageData(canvasW, canvasH);
  const data = imgData.data;

  const mask = cellScale === 8 ? FUSED_BEAD_MASK_8X8 : FUSED_BEAD_MASK_4X4;

  const rgbCache: Record<
    number,
    {
      base: [number, number, number];
      hi: [number, number, number];
      lo: [number, number, number];
    }
  > = {};

  for (const [idStr, hex] of Object.entries(template.color_lookup)) {
    const base = hexToRgb(hex);
    rgbCache[Number(idStr)] = {
      base,
      hi: adjustRgbLuminance(base, 28),
      lo: adjustRgbLuminance(base, -26),
    };
  }

  for (let row = 0; row < imgH; row++) {
    for (let col = 0; col < imgW; col++) {
      const colorId = template.grid[row]?.[col] ?? null;
      if (colorId === null || !rgbCache[colorId]) {
        continue; // Leaves alpha = 0 (transparent background)
      }

      const shades = rgbCache[colorId];
      const isDimmed =
        highlightedColorId !== null && colorId !== highlightedColorId;

      const cellStartX = col * cellScale;
      const cellStartY = row * cellScale;

      for (let py = 0; py < cellScale; py++) {
        const rowMask = mask[py];
        const outY = cellStartY + py;
        for (let px = 0; px < cellScale; px++) {
          const code = rowMask[px];
          if (code === 0) {
            continue; // Clipped rounded corner pixel stays transparent
          }

          const outX = cellStartX + px;
          const idx = (outY * canvasW + outX) * 4;

          let rgb = shades.base;
          if (code === 2) {
            rgb = shades.hi;
          } else if (code === 3) {
            rgb = shades.lo;
          }

          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = isDimmed ? 65 : 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
