/**
 * Sub-pixel sprite masks for mapping 1 logical fuse bead cell to a 4x4 or 8x8
 * block of display pixels.
 *
 * Legend for mask codes:
 *  0 = Empty / Background (Pegboard surface in On-Board mode, Transparent/Backdrop in Just-Image mode)
 *  1 = Primary Bead Body Color
 *  2 = Bead Top-Left Specular Highlight (+14% luminance)
 *  3 = Bead Bottom-Right Rim / Inner Dimple Shade (-14% luminance)
 *  4 = Pegboard Raised Peg Pin (center of empty cell or visible inside hollow bead hole)
 *  5 = Pegboard Subtle Grid Line
 */

export type MaskCode = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 8x8 "Just Image" Fused Bead Mask (rounded corners + subtle center ironed dimple)
 */
export const FUSED_BEAD_MASK_8X8: readonly (readonly MaskCode[])[] = [
  [0, 2, 2, 2, 2, 2, 1, 0],
  [2, 2, 2, 1, 1, 1, 1, 3],
  [2, 2, 1, 1, 1, 1, 1, 3],
  [2, 1, 1, 3, 3, 1, 1, 3],
  [2, 1, 1, 3, 3, 1, 1, 3],
  [2, 1, 1, 1, 1, 1, 1, 3],
  [1, 1, 1, 1, 1, 1, 3, 3],
  [0, 3, 3, 3, 3, 3, 3, 0],
];

/**
 * 8x8 "On-Board" Unmelted Tubular Bead Mask (octagonal round ring + 2x2 center peg hole)
 */
export const ON_BOARD_BEAD_MASK_8X8: readonly (readonly MaskCode[])[] = [
  [0, 0, 2, 2, 2, 1, 0, 0],
  [0, 2, 2, 1, 1, 1, 1, 0],
  [2, 2, 1, 3, 3, 1, 1, 3],
  [2, 1, 3, 4, 4, 3, 1, 3],
  [2, 1, 3, 4, 4, 3, 1, 3],
  [1, 1, 1, 3, 3, 1, 3, 3],
  [0, 1, 1, 1, 1, 3, 3, 0],
  [0, 0, 3, 3, 3, 3, 0, 0],
];

/**
 * 8x8 Empty Pegboard Cell Mask (subtle pegboard grid + 2x2 center peg pin)
 */
export const EMPTY_PEGBOARD_MASK_8X8: readonly (readonly MaskCode[])[] = [
  [5, 5, 5, 5, 5, 5, 5, 5],
  [5, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 4, 4, 0, 0, 0],
  [5, 0, 0, 4, 4, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * 4x4 "Just Image" Fused Bead Mask (clipped corners -> rounded 4x4 bead pixel)
 */
export const FUSED_BEAD_MASK_4X4: readonly (readonly MaskCode[])[] = [
  [0, 2, 1, 0],
  [2, 1, 1, 3],
  [1, 1, 1, 3],
  [0, 3, 3, 0],
];

/**
 * 4x4 "On-Board" Bead Mask (rounded corners + center hole/dimple)
 */
export const ON_BOARD_BEAD_MASK_4X4: readonly (readonly MaskCode[])[] = [
  [0, 2, 1, 0],
  [2, 3, 4, 3],
  [1, 4, 3, 3],
  [0, 3, 3, 0],
];

/**
 * 4x4 Empty Pegboard Cell Mask
 */
export const EMPTY_PEGBOARD_MASK_4X4: readonly (readonly MaskCode[])[] = [
  [5, 5, 5, 5],
  [5, 0, 4, 0],
  [5, 4, 0, 0],
  [5, 0, 0, 0],
];

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function adjustRgbLuminance(
  rgb: [number, number, number],
  delta: number
): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[1] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[2] + delta))),
  ];
}
