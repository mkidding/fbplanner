"""Perceptual CIELAB color quantizer mapping downsampled grids to universal 16/64/256 palettes."""

from collections import Counter
from dataclasses import dataclass
from typing import Optional
import numpy as np
from skimage.color import rgb2lab

from app.config import ALPHA_THRESHOLD, PaletteSize
from app.core.palettes import PaletteEntry, get_compiled_palette


@dataclass(frozen=True)
class QuantizationResult:
    grid: list[list[Optional[int]]]
    used_entries: list[tuple[PaletteEntry, int]]  # (entry, bead_count) sorted by count desc
    color_lookup: dict[int, str]
    total_beads: int


def summarize_grid_usage(
    grid: list[list[Optional[int]]],
    palette_size: PaletteSize,
) -> QuantizationResult:
    """Compute accurate bead counts and color lookup table from a finalized palette ID grid."""
    compiled = get_compiled_palette(palette_size)
    counts: Counter[int] = Counter()

    for row in grid:
        for pid in row:
            if pid is not None:
                counts[pid] += 1

    entry_by_id = {e.id: e for e in compiled.entries}
    used_entries: list[tuple[PaletteEntry, int]] = [
        (entry_by_id[pid], count)
        for pid, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        if pid in entry_by_id
    ]
    color_lookup = {entry.id: entry.hex for entry, _ in used_entries}
    total_beads = sum(counts.values())

    return QuantizationResult(
        grid=grid,
        used_entries=used_entries,
        color_lookup=color_lookup,
        total_beads=total_beads,
    )


def quantize_rgba_grid(
    rgba_grid: np.ndarray,
    palette_size: PaletteSize,
) -> QuantizationResult:
    """
    Map an (H, W, 4) uint8 RGBA array onto the specified universal palette (16, 64, or 256)
    using CIELAB perceptual distance.
    """
    compiled = get_compiled_palette(palette_size)
    h, w, _ = rgba_grid.shape
    alpha_mask = rgba_grid[:, :, 3] >= ALPHA_THRESHOLD

    grid: list[list[Optional[int]]] = [[None for _ in range(w)] for _ in range(h)]

    opaque_ys, opaque_xs = np.where(alpha_mask)
    if len(opaque_xs) > 0:
        opaque_rgb = rgba_grid[opaque_ys, opaque_xs, :3].astype(np.float64) / 255.0
        opaque_lab = rgb2lab(opaque_rgb.reshape(1, -1, 3)).reshape(-1, 3)

        # Compute squared Euclidean distance in CIELAB space (Delta E*ab)
        diffs = opaque_lab[:, np.newaxis, :] - compiled.lab_array[np.newaxis, :, :]
        dist_sq = np.sum(diffs * diffs, axis=2)
        nearest_indices = np.argmin(dist_sq, axis=1)

        for y_idx, x_idx, pal_idx in zip(opaque_ys, opaque_xs, nearest_indices):
            pid = int(compiled.entries[int(pal_idx)].id)
            grid[int(y_idx)][int(x_idx)] = pid

    return summarize_grid_usage(grid, palette_size)
