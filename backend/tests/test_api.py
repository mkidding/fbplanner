"""Tests for the Fuse Bead Template Creator backend pipeline and API."""

from io import BytesIO
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.core.palettes import get_compiled_palette
from app.main import app

client = TestClient(app)


def _create_sample_image_bytes(with_alpha: bool = False) -> bytes:
    """Create a synthetic image with a bright red/yellow figure on a white background."""
    mode = "RGBA" if with_alpha else "RGB"
    bg = (255, 255, 255, 0) if with_alpha else (245, 245, 245)
    img = Image.new(mode, (120, 160), bg)
    draw = ImageDraw.Draw(img)
    # Draw central character figure
    draw.ellipse((35, 30, 85, 80), fill=(255, 20, 20, 255) if with_alpha else (255, 20, 20))
    draw.rectangle((45, 75, 75, 130), fill=(20, 80, 250, 255) if with_alpha else (20, 80, 250))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_compiled_palettes():
    for size in (16, 64, 256):
        pal = get_compiled_palette(size)
        assert len(pal.entries) == size
        assert pal.rgb_array.shape == (size, 3)
        assert pal.lab_array.shape == (size, 3)


def test_health_and_config_endpoints():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    cfg_resp = client.get("/api/v1/templates/config")
    assert cfg_resp.status_code == 200
    data = cfg_resp.json()
    assert data["board_width"] == 52
    assert data["board_height"] == 52
    assert data["default_palette_size"] == 64
    assert data["allowed_palette_sizes"] == [16, 64, 256]
    assert "outer-contour" in data["allowed_contour_modes"]


def test_generate_template_endpoint_and_contour_modes():
    img_bytes = _create_sample_image_bytes(with_alpha=True)
    for contour_mode in ("outer-contour", "unify-edge", "none"):
        resp = client.post(
            "/api/v1/templates/generate",
            files={"file": ("sample.png", img_bytes, "image/png")},
            data={
                "target_width": "32",
                "target_height": "32",
                "palette_size": "64",
                "extract_foreground": "true",
                "preserve_aspect_ratio": "true",
                "contour_mode": contour_mode,
                "contour_color": "black",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["board_size"] == {"width": 52, "height": 52}
        assert body["contour_mode"] == contour_mode
        assert body["contour_color"] == "black"
        assert 1 <= body["image_size"]["width"] <= 32
        assert 1 <= body["image_size"]["height"] <= 32
        assert body["total_beads"] > 0
        if contour_mode != "none":
            # Black (#000000, id=0) should be present as the unified border color
            assert "0" in body["color_lookup"]
            assert body["color_lookup"]["0"] == "#000000"
