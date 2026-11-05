"""Endpoints for generating fuse bead templates and querying board config."""

from typing import cast
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import (
    ALLOWED_PALETTE_SIZES,
    BOARD_HEIGHT,
    BOARD_WIDTH,
    DEFAULT_PALETTE_SIZE,
    DEFAULT_TARGET_HEIGHT,
    DEFAULT_TARGET_WIDTH,
    MAX_UPLOAD_BYTES,
    PaletteSize,
)
from app.core.contour import ContourColorPreset, ContourMode
from app.schemas.template import TemplateGenerateResponse
from app.services.template_service import generate_fuse_bead_template

router = APIRouter(prefix="/templates", tags=["templates"])

ALLOWED_CONTOUR_MODES = ("outer-contour", "unify-edge", "none")
ALLOWED_CONTOUR_COLORS = ("black", "auto-dark", "white")


@router.get("/config")
def get_template_config() -> dict[str, object]:
    """Return board constraints and supported universal palette options."""
    return {
        "board_width": BOARD_WIDTH,
        "board_height": BOARD_HEIGHT,
        "default_target_width": DEFAULT_TARGET_WIDTH,
        "default_target_height": DEFAULT_TARGET_HEIGHT,
        "allowed_palette_sizes": list(ALLOWED_PALETTE_SIZES),
        "default_palette_size": DEFAULT_PALETTE_SIZE,
        "allowed_contour_modes": list(ALLOWED_CONTOUR_MODES),
        "allowed_contour_colors": list(ALLOWED_CONTOUR_COLORS),
        "max_upload_bytes": MAX_UPLOAD_BYTES,
    }


@router.post("/generate", response_model=TemplateGenerateResponse)
async def create_template(
    file: UploadFile = File(..., description="Raw source image file"),
    target_width: int = Form(DEFAULT_TARGET_WIDTH, ge=1, le=BOARD_WIDTH),
    target_height: int = Form(DEFAULT_TARGET_HEIGHT, ge=1, le=BOARD_HEIGHT),
    palette_size: int = Form(DEFAULT_PALETTE_SIZE),
    extract_foreground: bool = Form(True),
    preserve_aspect_ratio: bool = Form(True),
    contour_mode: str = Form("outer-contour"),
    contour_color: str = Form("black"),
    connect_parts: bool = Form(True),
) -> TemplateGenerateResponse:
    """Convert an uploaded image into a fuse bead template grid."""
    if palette_size not in ALLOWED_PALETTE_SIZES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid palette_size={palette_size}. Allowed values: {list(ALLOWED_PALETTE_SIZES)}",
        )
    if contour_mode not in ALLOWED_CONTOUR_MODES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid contour_mode={contour_mode}. Allowed values: {list(ALLOWED_CONTOUR_MODES)}",
        )
    if contour_color not in ALLOWED_CONTOUR_COLORS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid contour_color={contour_color}. Allowed values: {list(ALLOWED_CONTOUR_COLORS)}",
        )

    image_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB size limit.",
        )

    try:
        return generate_fuse_bead_template(
            image_bytes=image_bytes,
            target_width=target_width,
            target_height=target_height,
            palette_size=cast(PaletteSize, palette_size),
            extract_foreground=extract_foreground,
            preserve_aspect_ratio=preserve_aspect_ratio,
            contour_mode=cast(ContourMode, contour_mode),
            contour_color=cast(ContourColorPreset, contour_color),
            connect_parts=connect_parts,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process image: {str(exc)}",
        ) from exc
