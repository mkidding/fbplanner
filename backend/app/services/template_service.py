"""Service orchestrating image extraction, downsampling, quantization, unified border, and board placement."""

from io import BytesIO
from PIL import Image, ImageOps

from app.config import BOARD_HEIGHT, BOARD_WIDTH, PaletteSize
from app.core.contour import ContourColorPreset, ContourMode, apply_unified_border
from app.core.downsampler import downsample_to_bead_grid
from app.core.quantizer import quantize_rgba_grid, summarize_grid_usage
from app.core.segmentation import extract_foreground_image
from app.schemas.template import (
    BoardOffset,
    Dimensions,
    PaletteColorUsage,
    TemplateGenerateResponse,
)


def generate_fuse_bead_template(
    image_bytes: bytes,
    target_width: int,
    target_height: int,
    palette_size: PaletteSize,
    extract_foreground: bool = True,
    preserve_aspect_ratio: bool = True,
    contour_mode: ContourMode = "outer-contour",
    contour_color: ContourColorPreset = "black",
) -> TemplateGenerateResponse:
    """
    Execute the end-to-end fuse bead template generation pipeline:
    1. Decode and EXIF-orient raw image.
    2. Extract foreground figure & auto-crop transparent margins (if enabled).
    3. Downsample to target WxH (<= 52x52) using alpha-premultiplied bilateral resizing.
    4. Quantize to universal 16 / 64 / 256 color palette in CIELAB space.
    5. Smooth silhouette boundary, denoise edge fringe, and apply unified contour border.
    6. Center the resulting WxH bead pattern on the 52x52 pegboard.
    """
    raw_img = Image.open(BytesIO(image_bytes))
    raw_img = ImageOps.exif_transpose(raw_img)

    # Stage 1: Foreground extraction & tight subject bounding-box crop
    segmented_rgba = extract_foreground_image(raw_img, enable_extraction=extract_foreground)

    # Stage 2: Alpha-safe downsampling to bead grid dimensions (<= 52x52)
    rgba_grid = downsample_to_bead_grid(
        rgba_image=segmented_rgba,
        requested_width=target_width,
        requested_height=target_height,
        preserve_aspect_ratio=preserve_aspect_ratio,
        pad_for_outer_contour=(contour_mode == "outer-contour"),
    )
    actual_h, actual_w, _ = rgba_grid.shape

    # Stage 3: Perceptual color quantization against universal palette
    q_initial = quantize_rgba_grid(
        rgba_grid=rgba_grid,
        palette_size=palette_size,
    )

    # Stage 4: Unified smooth border & contour generation
    if contour_mode != "none":
        final_grid = apply_unified_border(
            grid=q_initial.grid,
            palette_size=palette_size,
            contour_mode=contour_mode,
            contour_color=contour_color,
        )
        q_result = summarize_grid_usage(final_grid, palette_size)
    else:
        q_result = q_initial

    # Stage 5: Center placement on the 52x52 board
    offset_x = max(0, (BOARD_WIDTH - actual_w) // 2)
    offset_y = max(0, (BOARD_HEIGHT - actual_h) // 2)

    palette_usage = [
        PaletteColorUsage(
            id=entry.id,
            name=entry.name,
            hex=entry.hex,
            rgb=entry.rgb,
            count=count,
        )
        for entry, count in q_result.used_entries
    ]

    return TemplateGenerateResponse(
        board_size=Dimensions(width=BOARD_WIDTH, height=BOARD_HEIGHT),
        requested_size=Dimensions(width=target_width, height=target_height),
        image_size=Dimensions(width=actual_w, height=actual_h),
        board_offset=BoardOffset(x=offset_x, y=offset_y),
        palette_size=int(palette_size),
        extract_foreground=extract_foreground,
        preserve_aspect_ratio=preserve_aspect_ratio,
        contour_mode=contour_mode,
        contour_color=contour_color,
        total_beads=q_result.total_beads,
        unique_colors_used=len(palette_usage),
        palette_usage=palette_usage,
        color_lookup=q_result.color_lookup,
        grid=q_result.grid,
    )
