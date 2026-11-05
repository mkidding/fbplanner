"""Application configuration and domain constants."""

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
