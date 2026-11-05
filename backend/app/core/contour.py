"""Silhouette smoothing, boundary color denoising, and unified single-color contour generation."""

from collections import Counter
from typing import Literal, Optional
import cv2
import numpy as np

from app.config import PaletteSize
from app.core.palettes import get_compiled_palette

ContourMode = Literal["outer-contour", "unify-edge", "none"]
ContourColorPreset = Literal["black", "white", "auto-dark"]


def resolve_contour_palette_id(
    palette_size: PaletteSize,
    color_preset: ContourColorPreset,
    grid: list[list[Optional[int]]],
) -> int:
    """
    Find the palette ID in the active universal palette (16/64/256) for the unified contour.
    """
    compiled = get_compiled_palette(palette_size)

    if color_preset == "black":
        return 0

    if color_preset == "white":
        for entry in compiled.entries:
            if entry.rgb == (255, 255, 255):
                return entry.id

    used_ids = [pid for row in grid for pid in row if pid is not None]
    if used_ids:
        entry_by_id = {e.id: e for e in compiled.entries}
        best_id = min(
            set(used_ids),
            key=lambda pid: float(compiled.lab_array[pid][0])
            if pid < len(compiled.lab_array)
            else 100.0,
        )
        if float(compiled.lab_array[best_id][0]) <= 45.0:
            return int(entry_by_id[best_id].id)

    return 0


def _smooth_binary_silhouette(grid: list[list[Optional[int]]]) -> list[list[Optional[int]]]:
    """
    Clean up 1-bead pinholes and isolated 1-bead spurs on the quantized grid so the
    silhouette boundary is continuous and smooth before applying a unified border.
    """
    h = len(grid)
    w = len(grid[0]) if h > 0 else 0
    if h < 3 or w < 3:
        return grid

    out = [row[:] for row in grid]

    # Pass 1: Fill 1-bead pinholes (empty cell with >= 3 orthogonal occupied neighbors)
    for r in range(1, h - 1):
        for c in range(1, w - 1):
            if out[r][c] is None:
                ortho = [
                    out[r - 1][c],
                    out[r + 1][c],
                    out[r][c - 1],
                    out[r][c + 1],
                ]
                valid = [x for x in ortho if x is not None]
                if len(valid) >= 3:
                    out[r][c] = Counter(valid).most_common(1)[0][0]

    # Pass 2: Remove isolated 0-neighbor or 1-neighbor stray boundary spikes
    cleaned = [row[:] for row in out]
    for r in range(h):
        for c in range(w):
            if out[r][c] is not None:
                ortho_count = 0
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and out[nr][nc] is not None:
                        ortho_count += 1
                if ortho_count == 0:
                    cleaned[r][c] = None

    return cleaned


def _unify_boundary_fringe_with_core(
    grid: list[list[Optional[int]]],
    fringe_thickness: int = 2,
) -> list[list[Optional[int]]]:
    """
    Eliminate noisy anti-aliased or multi-colored border transition pixels along the
    outer perimeter of the foreground figure (where distance from background <= fringe_thickness)
    by snapping them to the dominant local deep-interior core color.
    """
    h = len(grid)
    w = len(grid[0]) if h > 0 else 0
    if h < 5 or w < 5:
        return grid

    fg_mask = np.array([[1 if cell is not None else 0 for cell in row] for row in grid], dtype=np.uint8)
    # Pad with 0 on outside so border of canvas counts as background for distance transform
    padded_mask = np.pad(fg_mask, pad_width=1, mode="constant", constant_values=0)
    dist_map = cv2.distanceTransform(padded_mask, cv2.DIST_L1, 3)[1:-1, 1:-1]

    # Core pixels are strictly inside the figure (distance > fringe_thickness from empty space)
    core_mask = dist_map > float(fringe_thickness)
    if not np.any(core_mask):
        core_mask = dist_map > 1.0
    if not np.any(core_mask):
        return grid

    out = [row[:] for row in grid]

    # Replace fringe pixels (1 <= dist <= fringe_thickness) with the nearest local core color
    search_radius = 4
    for r in range(h):
        for c in range(w):
            if grid[r][c] is None or core_mask[r, c]:
                continue

            # Collect core colors within local neighborhood weighted by inverse distance
            core_candidates: Counter[int] = Counter()
            r0, r1 = max(0, r - search_radius), min(h, r + search_radius + 1)
            c0, c1 = max(0, c - search_radius), min(w, c + search_radius + 1)

            for nr in range(r0, r1):
                for nc in range(c0, c1):
                    if core_mask[nr, nc] and grid[nr][nc] is not None:
                        pid = grid[nr][nc]
                        assert pid is not None
                        manhattan = abs(nr - r) + abs(nc - c)
                        weight = max(1, (search_radius * 2 + 1) - manhattan)
                        core_candidates[pid] += weight

            if core_candidates:
                out[r][c] = core_candidates.most_common(1)[0][0]

    return out


def apply_unified_border(
    grid: list[list[Optional[int]]],
    palette_size: PaletteSize,
    contour_mode: ContourMode = "outer-contour",
    contour_color: ContourColorPreset = "black",
) -> list[list[Optional[int]]]:
    """
    Produce a clean, continuous, unified border around the fuse bead subject:
    - "outer-contour": Smooths silhouette, replaces noisy border fringe pixels with clean
      interior core colors, and wraps a continuous 1-bead single-color outline around the figure.
    - "unify-edge": Smooths silhouette, cleans interior fringe, and replaces the outermost
      perimeter beads of the subject with the unified single contour color.
    - "none": Returns grid unchanged.
    """
    if contour_mode == "none" or not grid or not grid[0]:
        return grid

    smoothed = _smooth_binary_silhouette(grid)
    denoised = _unify_boundary_fringe_with_core(smoothed, fringe_thickness=2)
    contour_pid = resolve_contour_palette_id(palette_size, contour_color, denoised)

    h = len(denoised)
    w = len(denoised[0])

    if contour_mode == "unify-edge":
        out = [row[:] for row in denoised]
        for r in range(h):
            for c in range(w):
                if denoised[r][c] is None:
                    continue
                touches_empty = (
                    r == 0
                    or r == h - 1
                    or c == 0
                    or c == w - 1
                    or denoised[r - 1][c] is None
                    or denoised[r + 1][c] is None
                    or denoised[r][c - 1] is None
                    or denoised[r][c + 1] is None
                )
                if touches_empty:
                    out[r][c] = contour_pid
        return out

    # contour_mode == "outer-contour"
    mask = np.array([[cell is not None for cell in row] for row in denoised], dtype=bool)
    if not np.any(mask):
        return denoised

    out = [row[:] for row in denoised]
    for r in range(h):
        for c in range(w):
            if denoised[r][c] is not None:
                continue
            # Empty cell adjacent (4-connected) to any occupied cell becomes the unified contour
            has_ortho_fg = False
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and denoised[nr][nc] is not None:
                    has_ortho_fg = True
                    break
            if has_ortho_fg:
                out[r][c] = contour_pid

    # Ensure any occupied pixel touching the outer frame boundary also gets unified
    for r in range(h):
        for c in range(w):
            if denoised[r][c] is not None and (r == 0 or r == h - 1 or c == 0 or c == w - 1):
                out[r][c] = contour_pid

    return out
