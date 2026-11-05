"""Universal 16, 64, and 256 standard color palettes with CIELAB precomputation."""

from dataclasses import dataclass
from functools import lru_cache
import numpy as np
from skimage.color import rgb2lab

from app.config import PaletteSize


@dataclass(frozen=True)
class PaletteEntry:
    id: int
    name: str
    rgb: tuple[int, int, int]
    hex: str


@dataclass(frozen=True)
class CompiledPalette:
    size: PaletteSize
    entries: tuple[PaletteEntry, ...]
    rgb_array: np.ndarray  # shape (N, 3), uint8
    lab_array: np.ndarray  # shape (N, 3), float64


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def _build_16_palette() -> list[PaletteEntry]:
    """Standard 16-color universal palette (4-bit standard colors)."""
    raw_colors: list[tuple[str, tuple[int, int, int]]] = [
        ("Black", (0, 0, 0)),
        ("Dark Gray", (85, 85, 85)),
        ("Light Gray", (170, 170, 170)),
        ("White", (255, 255, 255)),
        ("Maroon", (128, 0, 0)),
        ("Red", (255, 0, 0)),
        ("Brown / Orange", (170, 85, 0)),
        ("Yellow", (255, 255, 0)),
        ("Olive", (128, 128, 0)),
        ("Green", (0, 128, 0)),
        ("Lime", (0, 255, 0)),
        ("Teal", (0, 128, 128)),
        ("Cyan", (0, 255, 255)),
        ("Navy", (0, 0, 128)),
        ("Blue", (0, 0, 255)),
        ("Magenta", (255, 0, 255)),
    ]
    return [
        PaletteEntry(
            id=idx,
            name=f"P16-{idx:02d} ({name})",
            rgb=rgb,
            hex=_rgb_to_hex(*rgb),
        )
        for idx, (name, rgb) in enumerate(raw_colors)
    ]


def _build_64_palette() -> list[PaletteEntry]:
    """Standard 64-color universal palette (6-bit uniform 4x4x4 RGB grid)."""
    steps = (0, 85, 170, 255)
    entries: list[PaletteEntry] = []
    idx = 0
    for r in steps:
        for g in steps:
            for b in steps:
                hex_code = _rgb_to_hex(r, g, b)
                entries.append(
                    PaletteEntry(
                        id=idx,
                        name=f"P64-{idx:02d} ({hex_code})",
                        rgb=(r, g, b),
                        hex=hex_code,
                    )
                )
                idx += 1
    return entries


def _build_256_palette() -> list[PaletteEntry]:
    """Standard 256-color universal 8-bit palette (6x6x6 cube + grayscale & warm/cool ramps)."""
    seen: set[tuple[int, int, int]] = set()
    rgb_list: list[tuple[int, int, int]] = []

    # 1. 6x6x6 = 216 standard web-safe cube
    cube_steps = (0, 51, 102, 153, 204, 255)
    for r in cube_steps:
        for g in cube_steps:
            for b in cube_steps:
                color = (r, g, b)
                seen.add(color)
                rgb_list.append(color)

    # 2. Additional fine grayscale steps (20 intermediate levels)
    for v in range(8, 255, 12):
        color = (v, v, v)
        if color not in seen and len(rgb_list) < 256:
            seen.add(color)
            rgb_list.append(color)

    # 3. Skin tones, pastels, and earth tones to round out 256 universal colors
    extra_candidates = [
        (255, 224, 189), (255, 205, 148), (234, 192, 134), (255, 173, 96),
        (224, 172, 105), (198, 134, 66), (141, 85, 36), (92, 51, 23),
        (255, 182, 193), (255, 105, 180), (220, 20, 60), (139, 0, 0),
        (255, 140, 0), (255, 69, 0), (255, 215, 0), (240, 230, 140),
        (189, 183, 107), (85, 107, 47), (34, 139, 34), (46, 139, 87),
        (144, 238, 144), (32, 178, 170), (70, 130, 180), (100, 149, 237),
        (135, 206, 235), (25, 25, 112), (138, 43, 226), (147, 112, 219),
        (216, 191, 216), (245, 245, 220), (210, 180, 140), (160, 82, 45),
    ]
    for color in extra_candidates:
        if color not in seen and len(rgb_list) < 256:
            seen.add(color)
            rgb_list.append(color)

    # Pad deterministically if needed to reach exactly 256
    step_val = 17
    for r in range(step_val, 255, 34):
        for g in range(step_val, 255, 34):
            if len(rgb_list) >= 256:
                break
            color = (r, g, 128)
            if color not in seen:
                seen.add(color)
                rgb_list.append(color)

    rgb_list = rgb_list[:256]
    return [
        PaletteEntry(
            id=idx,
            name=f"P256-{idx:03d} ({_rgb_to_hex(*rgb)})",
            rgb=rgb,
            hex=_rgb_to_hex(*rgb),
        )
        for idx, rgb in enumerate(rgb_list)
    ]


@lru_cache(maxsize=8)
def get_compiled_palette(size: PaletteSize) -> CompiledPalette:
    """Return a compiled universal palette with precalculated CIELAB coordinates."""
    if size == 16:
        entries = _build_16_palette()
    elif size == 64:
        entries = _build_64_palette()
    elif size == 256:
        entries = _build_256_palette()
    else:
        raise ValueError(f"Unsupported palette size: {size}. Expected 16, 64, or 256.")

    rgb_array = np.array([e.rgb for e in entries], dtype=np.uint8)
    # Convert (N, 3) uint8 -> (1, N, 3) float [0..1] for skimage.color.rgb2lab
    rgb_normalized = rgb_array.reshape(1, -1, 3).astype(np.float64) / 255.0
    lab_array = rgb2lab(rgb_normalized).reshape(-1, 3)

    return CompiledPalette(
        size=size,
        entries=tuple(entries),
        rgb_array=rgb_array,
        lab_array=lab_array,
    )
