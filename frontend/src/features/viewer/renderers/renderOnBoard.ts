import { CellPixelScale, TemplateGenerateResponse } from "../../../types/template";
import {
  EMPTY_PEGBOARD_MASK_4X4,
  EMPTY_PEGBOARD_MASK_8X8,
  ON_BOARD_BEAD_MASK_4X4,
  ON_BOARD_BEAD_MASK_8X8,
  adjustRgbLuminance,
  hexToRgb,
} from "./beadSpriteMasks";

// Pegboard surface colors (warm translucent acrylic pegboard aesthetic)
const BOARD_BG_RGB: [number, number, number] = [30, 41, 59]; // slate-800 pegboard plate
const BOARD_GRID_RGB: [number, number, number] = [51, 65, 85]; // subtle cell divider
const BOARD_PEG_RGB: [number, number, number] = [100, 116, 139]; // raised peg pin
const IMAGE_BOUNDS_RGB: [number, number, number] = [71, 85, 105]; // subtle tint inside WxH target region

/**
 * Renders the full 52x52 pegboard ("On-Board" mode) into a pixel-exact ImageData buffer
 * where each board peg cell maps to a 4x4 or 8x8 block of display pixels.
 */
export function renderOnBoardToCanvas(
  ctx: CanvasRenderingContext2D,
  template: TemplateGenerateResponse,
  cellScale: CellPixelScale,
  highlightedColorId: number | null = null
): void {
  const boardW = template.board_size.width; // 52
  const boardH = template.board_size.height; // 52
  const canvasW = boardW * cellScale;
  const canvasH = boardH * cellScale;

  if (ctx.canvas.width !== canvasW || ctx.canvas.height !== canvasH) {
    ctx.canvas.width = canvasW;
    ctx.canvas.height = canvasH;
  }

  const imgData = ctx.createImageData(canvasW, canvasH);
  const data = imgData.data;

  const beadMask = cellScale === 8 ? ON_BOARD_BEAD_MASK_8X8 : ON_BOARD_BEAD_MASK_4X4;
  const emptyMask = cellScale === 8 ? EMPTY_PEGBOARD_MASK_8X8 : EMPTY_PEGBOARD_MASK_4X4;

  // Pre-compute RGB triples for each used color ID
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
      hi: adjustRgbLuminance(base, 36),
      lo: adjustRgbLuminance(base, -38),
    };
  }

  const offX = template.board_offset.x;
  const offY = template.board_offset.y;
  const imgW = template.image_size.width;
  const imgH = template.image_size.height;

  for (let boardRow = 0; boardRow < boardH; boardRow++) {
    for (let boardCol = 0; boardCol < boardW; boardCol++) {
      const inTargetArea =
        boardCol >= offX &&
        boardCol < offX + imgW &&
        boardRow >= offY &&
        boardRow < offY + imgH;

      const colorId = inTargetArea
        ? template.grid[boardRow - offY]?.[boardCol - offX] ?? null
        : null;

      const isDimmed =
        highlightedColorId !== null && colorId !== null && colorId !== highlightedColorId;

      const cellStartX = boardCol * cellScale;
      const cellStartY = boardRow * cellScale;

      if (colorId === null || !rgbCache[colorId]) {
        // Draw empty pegboard cell with raised peg pin
        for (let py = 0; py < cellScale; py++) {
          const rowMask = emptyMask[py];
          const outY = cellStartY + py;
          for (let px = 0; px < cellScale; px++) {
            const code = rowMask[px];
            const outX = cellStartX + px;
            const idx = (outY * canvasW + outX) * 4;

            let rgb = BOARD_BG_RGB;
            if (code === 4) {
              rgb = BOARD_PEG_RGB;
            } else if (code === 5) {
              rgb = inTargetArea ? IMAGE_BOUNDS_RGB : BOARD_GRID_RGB;
            }

            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
          }
        }
      } else {
        // Draw occupied cylindrical fuse bead over the pegboard cell
        const shades = rgbCache[colorId];
        for (let py = 0; py < cellScale; py++) {
          const rowMask = beadMask[py];
          const emptyRowMask = emptyMask[py];
          const outY = cellStartY + py;
          for (let px = 0; px < cellScale; px++) {
            const code = rowMask[px];
            const outX = cellStartX + px;
            const idx = (outY * canvasW + outX) * 4;

            let rgb: [number, number, number];
            if (code === 0) {
              const bgCode = emptyRowMask[px];
              rgb = bgCode === 5 ? BOARD_GRID_RGB : BOARD_BG_RGB;
            } else if (code === 4) {
              rgb = BOARD_PEG_RGB;
            } else if (code === 2) {
              rgb = shades.hi;
            } else if (code === 3) {
              rgb = shades.lo;
            } else {
              rgb = shades.base;
            }

            if (isDimmed && code !== 0 && code !== 4) {
              data[idx] = Math.round(rgb[0] * 0.28 + BOARD_BG_RGB[0] * 0.72);
              data[idx + 1] = Math.round(rgb[1] * 0.28 + BOARD_BG_RGB[1] * 0.72);
              data[idx + 2] = Math.round(rgb[2] * 0.28 + BOARD_BG_RGB[2] * 0.72);
            } else {
              data[idx] = rgb[0];
              data[idx + 1] = rgb[1];
              data[idx + 2] = rgb[2];
            }
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
