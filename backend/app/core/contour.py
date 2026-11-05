"""Silhouette smoothing, boundary color denoising, and unified single-color contour generation."""

from collections import Counter
from typing import Literal, Optional
import numpy as np

from app.config import PaletteSize
from app.core.palettes import get_compiled_palette

ContourMode = Literal["outer-contour", "unify-edge", "none"]
ContourColorPreset = Literal["black", "white", "auto-dark"]


def _resolve_contour_palette_id(
    palette_size: PaletteSize,
    color_preset: ContourColorPreset,
    grid: list[list[Optional[int]]],
) -> int:
    """
    Find the palette ID in the active universal palette (16/64/256) for the unified contour.
    """
    compiled = get_compiled_palette(palette_size)

    if color_preset == "black":
        # ID 0 is (0, 0, 0) in 16, 64, and 256 palettes
        return 0

    if color_preset == "white":
        # Find entry closest to (255, 255, 255)
        for entry in compiled.entries:
            if entry.rgb == (255, 255, 255):
                return entry.id

    # "auto-dark": pick the darkest used color, or darkest non-black color in palette
    used_ids = [pid for row in grid for pid in row if pid is not None]
    if used_ids:
        entry_by_id = {e.id: e for e in compiled.entries}
        # Pick a dark color biased toward the dominant hue or lowest luminance L*
        best_id = min(
            set(used_ids),
            key=lambda pid: float(compiled.lab_array[pid][0])
            if pid < len(compiled.lab_array)
            else 100.0,
        )
        # If the darkest used color is still bright (L* > 45), fall back to pure black (0)
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


def _denoise_boundary_fringe(grid: list[list[Optional[int]]]) -> list[list[Optional[int]]]:
    """
    Unify noisy anti-aliased fringe pixels on the outermost layer of the subject
    by snapping isolated edge colors to their dominant interior neighbor color.
    """
    h = len(grid)
    w = len(grid[0]) if h > 0 else 0
    if h < 3 or w < 3:
        return grid

    # Identify which cells are on the boundary vs strictly interior
    is_boundary = [[False] * w for _ in range(h)]
    for r in range(h):
        for c in range(w):
            if grid[r][c] is None:
                continue
            if r == 0 or r == h - 1 or c == 0 or c == w - 1:
                is_boundary[r][c] = True
                continue
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if grid[r + dr][c + dc] is None:
                    is_boundary[r][c] = True
                    break

    out = [row[:] for row in grid]

    # For each boundary pixel, check 3x3 neighborhood; if its color does not match
    # interior neighbors, unify it with the most common interior neighbor color.
    for r in range(h):
        for c in range(w):
            if not is_boundary[r][c]:
                continue
            current_color = grid[r][c]
            interior_neighbors: list[int] = []
            all_neighbors: list[int] = []
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] is not None:
                        pid = grid[nr][nc]
                        assert pid is not None
                        all_neighbors.append(pid)
                        if not is_boundary[nr][nc]:
                            interior_neighbors.append(pid)

            if interior_neighbors and current_color not in interior_neighbors:
                out[r][c] = Counter(interior_neighbors).most_common(1)[0][0]
            elif len(all_neighbors) >= 2 and all_neighbors.count(current_color) == 0:
                out[r][c] = Counter(all_neighbors).most_common(1)[0][0]

    return out


def apply_unified_border(
    grid: list[list[Optional[int]]],
    palette_size: PaletteSize,
    contour_mode: ContourMode = "outer-contour",
    contour_color: ContourColorPreset = "black",
) -> list[list[Optional[int]]]:
    """
    Produce a clean, continuous, unified border around the fuse bead subject:
    - "outer-contour": Smooths silhouette, denoises fringe colors, and wraps a continuous
      1-bead single-color outline around the subject.
    - "unify-edge": Smooths silhouette and replaces the outermost perimeter beads of the
      subject with the unified single contour color (and smooths interior fringe).
    - "none": Returns grid unchanged.
    """
    if contour_mode == "none" or not grid or not grid[0]:
        return grid

    smoothed = _smooth_binary_silhouette(grid)
    denoised = _denoise_boundary_fringe(smoothed)
    contour_pid = _resolve_contour_palette_id(palette_size, contour_color, denoised)

    h = len(denoised)
    w = len(denoised[0])

    if contour_mode == "unify-edge":
        out = [row[:] for row in denoised]
        for r in range(h):
            for c in range(w):
                if denoised[r][c] is None:
                    continue
                # Any occupied cell touching the canvas edge or an empty 4-neighbor becomes the unified border
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
    # Pad grid by 1 cell on any side where occupied beads touch the border (up to 52x52)
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

    # If an occupied pixel was directly on the outer frame edge (r=0, r=h-1, c=0, c=w-1),
    # unify its color to contour_pid so the outline never breaks at the bounding box edge
    for r in range(h):
        for c in range(w):
            if denoised[r][c] is not None and (r == 0 or r == h - 1 or c == 0 or c == w - 1):
                out[r][c] = contour_pid

    return out
