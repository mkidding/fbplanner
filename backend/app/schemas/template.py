"""Pydantic schemas for Fuse Bead Template generation."""

from typing import Optional
from pydantic import BaseModel, Field


class Dimensions(BaseModel):
    width: int = Field(..., ge=1, le=52, description="Width in fuse beads (1..52)")
    height: int = Field(..., ge=1, le=52, description="Height in fuse beads (1..52)")


class BoardOffset(BaseModel):
    x: int = Field(..., ge=0, le=51, description="Column offset on the 52x52 board")
    y: int = Field(..., ge=0, le=51, description="Row offset on the 52x52 board")


class PaletteColorUsage(BaseModel):
    id: int = Field(..., description="Universal palette color ID")
    name: str = Field(..., description="Human-readable color code/name")
    hex: str = Field(..., description="Hex color string (#RRGGBB)")
    rgb: tuple[int, int, int] = Field(..., description="RGB tuple (0..255)")
    count: int = Field(..., ge=1, description="Number of beads of this color used")


class TemplateGenerateResponse(BaseModel):
    board_size: Dimensions
    requested_size: Dimensions
    image_size: Dimensions
    board_offset: BoardOffset
    palette_size: int
    extract_foreground: bool
    preserve_aspect_ratio: bool
    contour_mode: str = "outer-contour"
    contour_color: str = "black"
    total_beads: int
    unique_colors_used: int
    palette_usage: list[PaletteColorUsage]
    color_lookup: dict[int, str]
    grid: list[list[Optional[int]]]
