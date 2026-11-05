"""Foreground extraction and alpha bounding-box cropping."""

from pathlib import Path
from typing import Optional
import cv2
import numpy as np
from PIL import Image

from app.config import ALPHA_THRESHOLD

_rembg_session: Optional[object] = None
_rembg_checked: bool = False


def _get_cached_rembg_session() -> Optional[object]:
    """Load rembg session if a local ONNX model is available."""
    global _rembg_session, _rembg_checked
    if _rembg_checked:
        return _rembg_session

    _rembg_checked = True
    u2net_dir = Path.home() / ".u2net"
    model_name: Optional[str] = None
    if (u2net_dir / "u2netp.onnx").exists():
        model_name = "u2netp"
    elif (u2net_dir / "u2net.onnx").exists():
        model_name = "u2net"

    if model_name is None:
        return None

    try:
        from rembg import new_session
        _rembg_session = new_session(model_name)
    except Exception:
        _rembg_session = None

    return _rembg_session


def _extract_foreground_opencv(rgb_np: np.ndarray) -> np.ndarray:
    """
    Fast deterministic foreground extraction using border color clustering + OpenCV GrabCut.
    Returns an RGBA uint8 array.
    """
    h, w, _ = rgb_np.shape
    # Work on a bounded resolution for speed (<150ms)
    max_dim = 320
    scale = min(1.0, max_dim / max(h, w))
    if scale < 1.0:
        work_w = max(16, int(round(w * scale)))
        work_h = max(16, int(round(h * scale)))
        small_rgb = cv2.resize(rgb_np, (work_w, work_h), interpolation=cv2.INTER_AREA)
    else:
        work_w, work_h = w, h
        small_rgb = rgb_np.copy()

    # Sample border pixels in CIELAB space to detect background color distribution
    lab = cv2.cvtColor(small_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    border_thickness = max(2, min(work_h, work_w) // 20)
    border_mask = np.zeros((work_h, work_w), dtype=bool)
    border_mask[:border_thickness, :] = True
    border_mask[-border_thickness:, :] = True
    border_mask[:, :border_thickness] = True
    border_mask[:, -border_thickness:] = True

    border_pixels = lab[border_mask]
    median_bg = np.median(border_pixels, axis=0)
    dist_from_bg = np.linalg.norm(lab - median_bg, axis=2)

    # Estimate background variance along the border
    border_dists = np.linalg.norm(border_pixels - median_bg, axis=1)
    bg_spread = float(np.percentile(border_dists, 75))

    # Build initial GrabCut mask
    gc_mask = np.full((work_h, work_w), cv2.GC_PR_FGD, dtype=np.uint8)
    bg_threshold = max(14.0, min(38.0, bg_spread * 1.6 + 10.0))
    fg_threshold = max(28.0, bg_threshold * 1.9)

    # Definite background on border and pixels matching border color closely
    gc_mask[border_mask & (dist_from_bg <= bg_threshold * 1.25)] = cv2.GC_BGD
    gc_mask[dist_from_bg <= bg_threshold * 0.75] = cv2.GC_BGD

    # Central region with strong color difference from border is likely foreground
    pad_y = max(2, work_h // 8)
    pad_x = max(2, work_w // 8)
    center_mask = np.zeros((work_h, work_w), dtype=bool)
    center_mask[pad_y : work_h - pad_y, pad_x : work_w - pad_x] = True
    gc_mask[center_mask & (dist_from_bg >= fg_threshold)] = cv2.GC_FGD

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        # Ensure both BG and FG seeds exist before running GrabCut
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
            fg_mask = np.where(
                (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
        else:
            rect = (
                max(1, work_w // 12),
                max(1, work_h // 12),
                max(2, work_w - 2 * max(1, work_w // 12)),
                max(2, work_h - 2 * max(1, work_h // 12)),
            )
            cv2.grabCut(
                small_rgb,
                gc_mask,
                rect,
                bgd_model,
                fgd_model,
                3,
                cv2.GC_INIT_WITH_RECT,
            )
            fg_mask = np.where(
                (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
    except Exception:
        fg_mask = np.where(dist_from_bg > bg_threshold, 255, 0).astype(np.uint8)

    # Clean small Morphological noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

    # Fallback: if mask accidentally removed >97% of the image, keep full image
    fg_ratio = float(np.count_nonzero(fg_mask)) / float(work_h * work_w)
    if fg_ratio < 0.03:
        fg_mask[:, :] = 255

    if scale < 1.0:
        fg_mask = cv2.resize(fg_mask, (w, h), interpolation=cv2.INTER_LINEAR)

    rgba = np.dstack((rgb_np, fg_mask))
    return rgba


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
    Convert input image to RGBA, optionally segmenting the foreground figure
    and trimming transparent margins around the subject.
    """
    rgba = image.convert("RGBA")
    if not enable_extraction:
        return rgba

    rgba_np = np.array(rgba)
    alpha = rgba_np[:, :, 3]

    # Check if image already has a transparent background (at least 5% transparent pixels)
    transparent_ratio = float(np.count_nonzero(alpha < ALPHA_THRESHOLD)) / float(alpha.size)
    if transparent_ratio >= 0.05:
        return crop_to_alpha_bbox(rgba, ALPHA_THRESHOLD)

    # Try rembg if a local ONNX model is cached
    session = _get_cached_rembg_session()
    if session is not None:
        try:
            from rembg import remove
            segmented = remove(rgba, session=session)
            return crop_to_alpha_bbox(segmented, ALPHA_THRESHOLD)
        except Exception:
            pass

    # Deterministic OpenCV LAB + GrabCut foreground segmentation
    rgb_np = rgba_np[:, :, :3]
    segmented_np = _extract_foreground_opencv(rgb_np)
    segmented_img = Image.fromarray(segmented_np, mode="RGBA")
    return crop_to_alpha_bbox(segmented_img, ALPHA_THRESHOLD)
