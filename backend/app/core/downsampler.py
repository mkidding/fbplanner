"""Alpha-aware, edge-preserving image downsampler for fuse bead grids."""

import cv2
import numpy as np
from PIL import Image

from app.config import ALPHA_THRESHOLD, BOARD_HEIGHT, BOARD_WIDTH


def compute_target_dimensions(
    src_width: int,
    src_height: int,
    requested_width: int,
    requested_height: int,
    preserve_aspect_ratio: bool = True,
) -> tuple[int, int]:
    """
    Calculate the output bead grid (width, height) clamped to [1..52].
    When preserve_aspect_ratio is True, fits proportionally inside (requested_width, requested_height).
    """
    req_w = max(1, min(BOARD_WIDTH, requested_width))
    req_h = max(1, min(BOARD_HEIGHT, requested_height))

    if not preserve_aspect_ratio or src_width <= 0 or src_height <= 0:
        return req_w, req_h

    scale = min(req_w / float(src_width), req_h / float(src_height))
    out_w = max(1, min(req_w, int(round(src_width * scale))))
    out_h = max(1, min(req_h, int(round(src_height * scale))))
    return out_w, out_h


def downsample_to_bead_grid(
    rgba_image: Image.Image,
    requested_width: int,
    requested_height: int,
    preserve_aspect_ratio: bool = True,
    pad_for_outer_contour: bool = False,
) -> np.ndarray:
    """
    Downsample an RGBA PIL Image to an (H, W, 4) uint8 numpy array suitable for bead quantization.
    Uses alpha-premultiplied area interpolation so transparent background pixels never bleed dark fringes
    into edge beads.
    When pad_for_outer_contour is True, reserves a 1-bead transparent margin around the subject within
    the target WxH so a 1-bead outer contour can wrap cleanly without clipping the figure.
    """
    rgba_np = np.array(rgba_image.convert("RGBA"), dtype=np.uint8)
    src_h, src_w, _ = rgba_np.shape

    out_w, out_h = compute_target_dimensions(
        src_width=src_w,
        src_height=src_h,
        requested_width=requested_width,
        requested_height=requested_height,
        preserve_aspect_ratio=preserve_aspect_ratio,
    )

    use_margin = pad_for_outer_contour and out_w >= 5 and out_h >= 5
    inner_w = out_w - 2 if use_margin else out_w
    inner_h = out_h - 2 if use_margin else out_h

    rgb = rgba_np[:, :, :3]
    alpha = rgba_np[:, :, 3:4].astype(np.float32) / 255.0

    # Apply a light bilateral filter to RGB when image is larger than target grid
    # to flatten high-frequency sensor noise while keeping crisp silhouette/feature boundaries
    if src_w > inner_w * 2 or src_h > inner_h * 2:
        work_max = 256
        if max(src_w, src_h) > work_max:
            s = work_max / float(max(src_w, src_h))
            mid_w = max(inner_w, int(round(src_w * s)))
            mid_h = max(inner_h, int(round(src_h * s)))
            rgb = cv2.resize(rgb, (mid_w, mid_h), interpolation=cv2.INTER_AREA)
            alpha = cv2.resize(alpha, (mid_w, mid_h), interpolation=cv2.INTER_AREA)
            if alpha.ndim == 2:
                alpha = alpha[:, :, np.newaxis]
        rgb = cv2.bilateralFilter(rgb, d=5, sigmaColor=35, sigmaSpace=35)

    # Premultiply RGB by alpha before area downsampling to prevent transparent pixel bleed
    premultiplied_rgb = rgb.astype(np.float32) * alpha

    interp = (
        cv2.INTER_AREA
        if (rgb.shape[1] >= inner_w and rgb.shape[0] >= inner_h)
        else cv2.INTER_LINEAR
    )
    down_premult_rgb = cv2.resize(premultiplied_rgb, (inner_w, inner_h), interpolation=interp)
    down_alpha = cv2.resize(alpha, (inner_w, inner_h), interpolation=interp)
    if down_alpha.ndim == 2:
        down_alpha = down_alpha[:, :, np.newaxis]

    # Un-premultiply where alpha is non-zero
    safe_alpha = np.where(down_alpha > 1e-3, down_alpha, 1.0)
    unpremult_rgb = np.clip(np.round(down_premult_rgb / safe_alpha), 0, 255).astype(np.uint8)
    out_alpha = np.clip(np.round(down_alpha * 255.0), 0, 255).astype(np.uint8)

    # Snap alpha channel cleanly around ALPHA_THRESHOLD
    out_alpha = np.where(out_alpha >= ALPHA_THRESHOLD, 255, 0).astype(np.uint8)
    inner_rgba = np.dstack((unpremult_rgb, out_alpha))

    if not use_margin:
        return inner_rgba

    padded = np.zeros((out_h, out_w, 4), dtype=np.uint8)
    padded[1 : 1 + inner_h, 1 : 1 + inner_w, :] = inner_rgba
    return padded
