"""Foreground extraction (Background Removal) and alpha bounding-box cropping."""

from collections import deque
from pathlib import Path
from typing import Optional
import cv2
import numpy as np
from PIL import Image

from app.config import ALPHA_THRESHOLD

_rembg_session: Optional[object] = None
_rembg_checked: bool = False


def _get_cached_rembg_session() -> Optional[object]:
    """Load rembg u2netp/u2net session if available in ~/.rembg or ~/.u2net."""
    global _rembg_session, _rembg_checked
    if _rembg_checked:
        return _rembg_session

    _rembg_checked = True
    rembg_dir = Path.home() / ".rembg" / "models"
    u2net_dir = Path.home() / ".u2net"

    model_name: Optional[str] = None
    if (rembg_dir / "u2netp" / "u2netp.onnx").exists() or (u2net_dir / "u2netp.onnx").exists():
        model_name = "u2netp"
    elif (rembg_dir / "u2net" / "u2net.onnx").exists() or (u2net_dir / "u2net.onnx").exists():
        model_name = "u2net"

    if model_name is None:
        return None

    try:
        from rembg import new_session
        _rembg_session = new_session(model_name)
    except Exception:
        _rembg_session = None

    return _rembg_session


def _border_connected_floodfill_mask(lab: np.ndarray, tolerance: float = 18.0) -> np.ndarray:
    """
    Flood-fill from all 4 image borders in CIELAB space to identify background pixels
    that are continuously connected to the outer frame.
    Returns a uint8 foreground mask (255 = foreground, 0 = border-connected background).
    """
    h, w, _ = lab.shape
    bg_visited = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    # Seed all perimeter pixels
    for x in range(w):
        bg_visited[0, x] = True
        queue.append((0, x))
        if h > 1:
            bg_visited[h - 1, x] = True
            queue.append((h - 1, x))
    for y in range(1, h - 1):
        bg_visited[y, 0] = True
        queue.append((y, 0))
        if w > 1:
            bg_visited[y, w - 1] = True
            queue.append((y, w - 1))

    # Compute median border color to anchor flood-fill against gradual drift into the subject
    border_pixels = np.concatenate(
        [lab[0, :], lab[h - 1, :], lab[:, 0], lab[:, w - 1]], axis=0
    )
    anchor_lab = np.median(border_pixels, axis=0)
    max_anchor_dist = tolerance * 1.85
    step_tol_sq = (tolerance * 0.65) ** 2

    while queue:
        cy, cx = queue.popleft()
        cur_lab = lab[cy, cx]
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg_visited[ny, nx]:
                n_lab = lab[ny, nx]
                step_dist_sq = float(np.sum((n_lab - cur_lab) ** 2))
                anchor_dist = float(np.linalg.norm(n_lab - anchor_lab))
                if step_dist_sq <= step_tol_sq and anchor_dist <= max_anchor_dist:
                    bg_visited[ny, nx] = True
                    queue.append((ny, nx))

    fg_mask = np.where(bg_visited, 0, 255).astype(np.uint8)
    return fg_mask


def _extract_foreground_hybrid(rgb_np: np.ndarray, rgba_img: Image.Image) -> np.ndarray:
    """
    Hybrid foreground extraction combining:
    1. Border-seeded CIELAB flood-fill + GrabCut (razor-sharp on studio/solid/gradient backdrops).
    2. Neural U2-Net (`rembg`) for complex multi-color photographic scenes.
    Returns an RGBA uint8 array.
    """
    h, w, _ = rgb_np.shape
    max_dim = 320
    scale = min(1.0, max_dim / max(h, w))
    if scale < 1.0:
        work_w = max(16, int(round(w * scale)))
        work_h = max(16, int(round(h * scale)))
        small_rgb = cv2.resize(rgb_np, (work_w, work_h), interpolation=cv2.INTER_AREA)
    else:
        work_w, work_h = w, h
        small_rgb = rgb_np.copy()

    lab = cv2.cvtColor(small_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    border_thickness = max(2, min(work_h, work_w) // 20)
    border_mask = np.zeros((work_h, work_w), dtype=bool)
    border_mask[:border_thickness, :] = True
    border_mask[-border_thickness:, :] = True
    border_mask[:, :border_thickness] = True
    border_mask[:, -border_thickness:] = True

    border_pixels = lab[border_mask]
    median_bg = np.median(border_pixels, axis=0)
    border_dists = np.linalg.norm(border_pixels - median_bg, axis=1)
    bg_spread = float(np.percentile(border_dists, 80))

    # First try border-connected flood-fill for uniform/gradient backgrounds
    flood_tol = max(16.0, min(34.0, bg_spread * 1.5 + 12.0))
    flood_fg = _border_connected_floodfill_mask(lab, tolerance=flood_tol)
    flood_fg_ratio = float(np.count_nonzero(flood_fg)) / float(work_h * work_w)

    # If the border has high complexity (cluttered scene) or flood-fill didn't isolate the subject,
    # try neural U2-Net session if available
    session = _get_cached_rembg_session()
    if session is not None and (bg_spread > 22.0 or flood_fg_ratio > 0.92 or flood_fg_ratio < 0.04):
        try:
            from rembg import remove
            rembg_out = remove(rgba_img, session=session)
            rembg_np = np.array(rembg_out.convert("RGBA"))
            rembg_alpha = rembg_np[:, :, 3]
            fg_ratio = float(np.count_nonzero(rembg_alpha >= ALPHA_THRESHOLD)) / float(rembg_alpha.size)
            if 0.03 <= fg_ratio <= 0.96:
                return rembg_np
        except Exception:
            pass

    # Refine with GrabCut seeded by border flood-fill + LAB distance
    dist_from_bg = np.linalg.norm(lab - median_bg, axis=2)
    gc_mask = np.full((work_h, work_w), cv2.GC_PR_FGD, dtype=np.uint8)
    bg_threshold = max(14.0, min(38.0, bg_spread * 1.6 + 10.0))
    fg_threshold = max(26.0, bg_threshold * 1.8)

    gc_mask[flood_fg == 0] = cv2.GC_BGD
    gc_mask[border_mask & (dist_from_bg <= bg_threshold * 1.25)] = cv2.GC_BGD

    pad_y = max(2, work_h // 8)
    pad_x = max(2, work_w // 8)
    center_mask = np.zeros((work_h, work_w), dtype=bool)
    center_mask[pad_y : work_h - pad_y, pad_x : work_w - pad_x] = True
    gc_mask[center_mask & (flood_fg > 0) & (dist_from_bg >= fg_threshold)] = cv2.GC_FGD

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    fg_mask = flood_fg
    try:
        if np.any(gc_mask == cv2.GC_BGD) and np.any(
            (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD)
        ):
            cv2.grabCut(
                small_rgb,
                gc_mask,
                None,
                bgd_model,
                fgd_model,
                3,
                cv2.GC_INIT_WITH_MASK,
            )
            gc_fg = np.where(
                (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
            # Combine GrabCut with flood-fill if GrabCut produced a valid subject
            gc_ratio = float(np.count_nonzero(gc_fg)) / float(work_h * work_w)
            if 0.04 <= gc_ratio <= 0.94:
                fg_mask = gc_fg
    except Exception:
        pass

    # Clean morphological speckles
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

    fg_ratio = float(np.count_nonzero(fg_mask)) / float(work_h * work_w)
    if fg_ratio < 0.03:
        fg_mask[:, :] = 255

    if scale < 1.0:
        fg_mask = cv2.resize(fg_mask, (w, h), interpolation=cv2.INTER_LINEAR)

    return np.dstack((rgb_np, fg_mask))


def crop_to_alpha_bbox(rgba_img: Image.Image, alpha_threshold: int = ALPHA_THRESHOLD) -> Image.Image:
    """Crop an RGBA image tightly around pixels with alpha >= alpha_threshold."""
    rgba_np = np.array(rgba_img)
    alpha = rgba_np[:, :, 3]
    ys, xs = np.where(alpha >= alpha_threshold)
    if len(xs) == 0 or len(ys) == 0:
        return rgba_img

    x_min, x_max = int(xs.min()), int(xs.max()) + 1
    y_min, y_max = int(ys.min()), int(ys.max()) + 1
    return rgba_img.crop((x_min, y_min, x_max, y_max))


def extract_foreground_image(image: Image.Image, enable_extraction: bool = True) -> Image.Image:
    """
    Convert input image to RGBA, segmenting the foreground figure (removing background)
    and trimming transparent margins around the subject when `enable_extraction` is True.
    """
    rgba = image.convert("RGBA")
    if not enable_extraction:
        return rgba

    rgba_np = np.array(rgba)
    alpha = rgba_np[:, :, 3]

    # If image already has a transparent background (>= 5% transparent pixels), crop to subject
    transparent_ratio = float(np.count_nonzero(alpha < ALPHA_THRESHOLD)) / float(alpha.size)
    if transparent_ratio >= 0.05:
        return crop_to_alpha_bbox(rgba, ALPHA_THRESHOLD)

    rgb_np = rgba_np[:, :, :3]
    segmented_np = _extract_foreground_hybrid(rgb_np, rgba)
    segmented_img = Image.fromarray(segmented_np, mode="RGBA")
    return crop_to_alpha_bbox(segmented_img, ALPHA_THRESHOLD)
