"""Application configuration and domain constants."""

import os
from typing import Literal

BOARD_WIDTH: int = 52
BOARD_HEIGHT: int = 52

DEFAULT_TARGET_WIDTH: int = 36
DEFAULT_TARGET_HEIGHT: int = 36

PaletteSize = Literal[16, 64, 256]
ALLOWED_PALETTE_SIZES: tuple[int, ...] = (16, 64, 256)
DEFAULT_PALETTE_SIZE: PaletteSize = 64

# Alpha threshold (0..255) above which a pixel is considered an occupied fuse bead
ALPHA_THRESHOLD: int = 110

# Maximum allowed image upload size (10 MB default)
MAX_UPLOAD_BYTES: int = int(os.getenv("FB_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

# Maximum pixel count to guard against image decompression bombs (25 megapixels)
MAX_IMAGE_PIXELS: int = 25_000_000

# Allowed CORS origins (comma-separated via FB_CORS_ORIGINS env var)
_default_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:4173,"
    "http://127.0.0.1:4173,"
    "http://localhost:8080,"
    "http://127.0.0.1:8080"
)
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("FB_CORS_ORIGINS", _default_origins).split(",")
    if origin.strip()
]
