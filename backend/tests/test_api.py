"""Tests for the Fuse Bead Template Creator backend pipeline, background removal, and part connectivity."""

from io import BytesIO
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.core.connectivity import connect_separated_parts, find_orthogonal_components
from app.core.palettes import get_compiled_palette
from app.main import app

client = TestClient(app)


def _create_sample_image_with_separated_parts() -> bytes:
    """
    Create a synthetic image with a colored studio background (#fef3c7) and a figure
    that has 3 separated islands (central body + floating top orb + floating side hand).
    """
    img = Image.new("RGB", (200, 200), (254, 243, 199))
    draw = ImageDraw.Draw(img)
    # Floating top orb (separated island 1)
    draw.ellipse((90, 15, 110, 35), fill=(255, 100, 0))
    # Main central robot body (island 2)
    draw.rectangle((70, 65, 130, 155), fill=(0, 180, 210))
    # Floating right hand (separated island 3)
    draw.ellipse((158, 100, 182, 124), fill=(255, 100, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_compiled_palettes():
    for size in (16, 64, 256):
        pal = get_compiled_palette(size)
        assert len(pal.entries) == size
        assert pal.rgb_array.shape == (size, 3)
        assert pal.lab_array.shape == (size, 3)


def test_connect_separated_parts_unit():
    # 10x10 grid with 3 disconnected islands and 1diagonal-only joint
    grid: list[list[int | None]] = [[None for _ in range(10)] for _ in range(10)]
    # Main block at (4..6, 4..6)
    for r in range(4, 7):
        for c in range(4, 7):
            grid[r][c] = 10
    # Separated island at (1, 5)
    grid[1][5] = 20
    grid[1][6] = 20
    # Diagonal-only neighbor at (7, 7)
    grid[7][7] = 30

    before = find_orthogonal_components(grid)
    assert len(before) == 3

    res = connect_separated_parts(grid, bridge_color_id=0, enable_bridge=True)
    assert res.initial_components == 3
    assert res.final_components == 1
    assert res.bridge_beads_added > 0
    after = find_orthogonal_components(res.grid)
    assert len(after) == 1


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


def test_generate_template_background_removal_and_part_bridging():
    img_bytes = _create_sample_image_with_separated_parts()

    # 1. With connect_parts = False, separated islands remain disconnected
    resp_unbridged = client.post(
        "/api/v1/templates/generate",
        files={"file": ("separated.png", img_bytes, "image/png")},
        data={
            "target_width": "36",
            "target_height": "36",
            "palette_size": "64",
            "extract_foreground": "true",
            "preserve_aspect_ratio": "true",
            "contour_mode": "outer-contour",
            "contour_color": "black",
            "connect_parts": "false",
        },
    )
    assert resp_unbridged.status_code == 200, resp_unbridged.text
    unbridged_body = resp_unbridged.json()
    assert unbridged_body["connectivity"]["initial_components"] >= 2
    assert unbridged_body["connectivity"]["final_components"] >= 2
    assert unbridged_body["extracted_preview_data_url"].startswith("data:image/png;base64,")

    # 2. With connect_parts = True, separated islands are bridged into 1 physical piece
    resp_bridged = client.post(
        "/api/v1/templates/generate",
        files={"file": ("separated.png", img_bytes, "image/png")},
        data={
            "target_width": "36",
            "target_height": "36",
            "palette_size": "64",
            "extract_foreground": "true",
            "preserve_aspect_ratio": "true",
            "contour_mode": "outer-contour",
            "contour_color": "black",
            "connect_parts": "true",
        },
    )
    assert resp_bridged.status_code == 200, resp_bridged.text
    bridged_body = resp_bridged.json()
    assert bridged_body["connectivity"]["initial_components"] >= 2
    assert bridged_body["connectivity"]["final_components"] == 1
    assert bridged_body["connectivity"]["bridge_beads_added"] > 0
