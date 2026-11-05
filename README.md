# FuseBead Studio (`fbplanner`)

[![CI](https://github.com/mkidding/fbplanner/actions/workflows/ci.yml/badge.svg)](https://github.com/mkidding/fbplanner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](./LICENSE)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_Python_3.11+-009688.svg)](./backend)
[![Frontend: React + TypeScript + Vite](https://img.shields.io/badge/Frontend-React_%2B_TS_%2B_Tailwind-61dafb.svg)](./frontend)

A full-stack web application that converts raw images and illustrations into craftable **52×52 Fuse Bead (Hot Melt Board)** templates.

Instead of naive image resizing (which creates blurry edges and muddy anti-aliased fringe colors), **FuseBead Studio** extracts the foreground subject, denoises boundary fringes, quantizes colors perceptually in **CIELAB (`L*a*b*`)** space onto **Universal 16 / 64 / 256 Color Palettes**, wraps a continuous **single-color contour**, and renders each bead as a **4×4 or 8×8 sub-pixel sprite** with rounded corners.

---

## Screenshots

### 1. "On-Board" Display Mode (52×52 Pegboard View)
Displays the full **52×52 pegboard** with raised center pegs on empty cells and unmelted hollow cylindrical fuse beads on occupied cells:

![On-Board 52x52 Pegboard View](./docs/screenshots/on-board-view.png)

### 2. "Just Image" Display Mode (Post-Creation Fused Bead View)
Simulates the ironed/melted fuse bead piece after crafting, rendering each bead on an `8×8` (or `4×4`) pixel block with clipped rounded corners and a subtle center fused dimple:

![Just Image Fused Bead View](./docs/screenshots/just-image-view.png)

### 3. Retro Bot Sample & Interactive Bead Bill of Materials (BOM)
Click any color in the right-hand **Bead Bill of Materials** to isolate and highlight its exact peg positions on the 52×52 board:

![Retro Bot Template View](./docs/screenshots/robot-template-view.png)

---

## Key Features

- **Automatic Foreground Extraction & Auto-Crop:** Strips background scenes (via local `rembg` ONNX session or deterministic OpenCV LAB + GrabCut segmentation) and crops tightly around the foreground figure so your subject maximizes the target bead dimensions.
- **Unified Border & Single-Color Contour:**
  - **Silhouette Smoothing:** Fills 1-bead pinholes and prunes stray 1-bead spurs.
  - **Boundary Fringe Denoising:** Replaces anti-aliased edge transition pixels with the nearest interior core color.
  - **Outer Contour / Unify Edge:** Wraps a continuous 1-bead outline (`Black #000`, `Auto Darkest`, or `White #FFF`) around the figure so the template looks crisp and holds together physically when ironed.
- **Universal `16 / 64 / 256` Color Palettes (Default: `64`):** Perceptual CIELAB ($\Delta E$) nearest-color matching onto standard 4-bit (16), 6-bit (64), and 8-bit (256) universal palettes.
- **52×52 Pegboard Constraint:** Target output dimensions (`W × H`, up to `52×52`) with optional aspect-ratio lock (`Fit Aspect`), automatically centered on the 52×52 board.
- **Sub-Pixel Bead Sprite Renderer (`4×4px` or `8×8px` per Bead):**
  - Instant local toggle between **On-Board (52×52 Pegboard)** and **Just Image (Fused Bead View)**.
  - Native `1×` hardware pixel rendering (`image-rendering: pixelated`) plus `2×` and `3×` crisp integer magnification.
  - Hover coordinate inspector (`Peg (col, row)` + color hex) and one-click **Export PNG**.

---

## Architecture & Project Structure

The repository is structured with strict **Frontend / Backend separation**:

```text
fbplanner/
├── backend/                        # Python + FastAPI Image Processing Service
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory & CORS setup
│   │   ├── config.py               # Board constants (52x52), upload limits & CORS settings
│   │   ├── api/
│   │   │   ├── router.py           # /api/v1 router
│   │   │   └── endpoints/
│   │   │       └── templates.py    # GET /config, POST /templates/generate
│   │   ├── schemas/
│   │   │   └── template.py         # Pydantic request/response models
│   │   ├── services/
│   │   │   └── template_service.py # Multi-stage pipeline orchestrator
│   │   └── core/
│   │       ├── segmentation.py     # Foreground extraction & alpha auto-crop
│   │       ├── downsampler.py      # Alpha-premultiplied bilateral downsampler
│   │       ├── palettes.py         # Universal 16 / 64 / 256 palettes + CIELAB cache
│   │       ├── quantizer.py        # Perceptual CIELAB color matching & BOM counter
│   │       └── contour.py          # Silhouette smoothing, fringe denoising & unified outline
│   └── tests/
│       └── test_api.py             # Pytest suite for palettes, contour modes & API
│
├── frontend/                       # React + TypeScript + Vite + Tailwind CSS Studio
│   ├── Dockerfile
│   ├── nginx.conf                  # Production Nginx config & /api reverse proxy
│   ├── package.json
│   ├── vite.config.ts              # Dev server proxy (/api -> http://127.0.0.1:8000)
│   └── src/
│       ├── App.tsx                 # 3-column studio layout
│       ├── api/
│       │   └── templateApi.ts      # Typed HTTP client (supports VITE_API_BASE_URL)
│       ├── types/
│       │   └── template.ts         # Shared TypeScript interfaces
│       ├── features/
│       │   ├── controls/           # ImageUploader, PaletteSelector, DimensionControls, ContourControls
│       │   ├── viewer/             # TemplateViewer, BeadCanvas & 4x4/8x8 ImageData sprite renderers
│       │   └── legend/             # ColorBomPanel (inventory counts & single-color peg highlighter)
│       └── utils/
│           └── sampleSpriteGenerator.ts
│
└── docker-compose.yml              # One-command full-stack container orchestration
```

---

## Guide 1: Running & Testing Locally (Desktop / Laptop)

Use this guide if you want to run, customize, or test the application directly on your local machine.

### 1. Prerequisites
- **Git**
- **Python 3.11+** (with standard `venv`/`pip` or [`uv`](https://docs.astral.sh/uv/))
- **Node.js 18+** (Node 20/22 LTS recommended) and `npm`

### 2. Clone the Repository
```bash
git clone https://github.com/mkidding/fbplanner.git
cd fbplanner
```

### 3. Start the Backend Server (Terminal 1 — Port `8000`)

#### Using `venv` + `pip`:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt

# Launch FastAPI with live reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Or using `uv` (faster):
```bash
cd backend
uv venv .venv --python 3.11
uv pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Optional — High-Precision `rembg` ONNX Model:**
> Out of the box, the backend uses a fast, zero-download OpenCV CIELAB + GrabCut foreground segmenter. If you want `rembg`'s neural U2-Net segmentation locally, place `u2netp.onnx` or `u2net.onnx` in `~/.u2net/` (or run `python -c "from rembg import new_session; new_session('u2netp')"` once inside `.venv`). The backend automatically detects and uses `~/.u2net/u2netp.onnx` when present.

### 4. Start the Frontend Dev Server (Terminal 2 — Port `5173`)
```bash
cd frontend
npm install
npm run dev
```
- Open **http://localhost:5173** in your browser.
- Vite's dev server automatically proxies all `/api/*` requests to `http://127.0.0.1:8000`.
- Interactive backend OpenAPI/Swagger documentation is available at **http://127.0.0.1:8000/docs**.

### 5. Local Verification & Test Suite
Run these commands to verify that both backend and frontend are healthy:

```bash
# 1. Run Backend Automated Pytest Suite (tests palettes, contour modes & endpoints)
cd backend
.venv/bin/pytest -v

# 2. Verify Backend Health & Config Endpoints via curl
curl -s http://127.0.0.1:8000/api/v1/health
# Expected: {"status":"ok"}

curl -s http://127.0.0.1:8000/api/v1/templates/config
# Expected: {"board_width":52,"board_height":52,"default_palette_size":64,...}

# 3. Run Frontend TypeScript Typecheck & Production Bundle Build
cd ../frontend
npm run build
```

---

## Guide 2: Server & Cloud Deployment (Run & Test in the Cloud)

You can deploy **FuseBead Studio** either as a **single unified stack via Docker Compose** (on any Linux VPS / EC2 / DigitalOcean Droplet / homelab server) or as **separate Frontend + Backend services** on managed cloud platforms (Render, Railway, Fly.io, Google Cloud Run, Vercel, Netlify).

### Environment Variables Reference

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `FB_CORS_ORIGINS` | Backend | `http://localhost:5173,http://localhost:8080,...` | Comma-separated list of allowed frontend origins (e.g. `https://beads.example.com`). |
| `FB_MAX_UPLOAD_BYTES` | Backend | `10485760` (10 MB) | Maximum allowed raw image upload size in bytes. Returns HTTP `413` if exceeded. |
| `VITE_API_BASE_URL` | Frontend (Build-time) | `/api/v1` | Override only when hosting the frontend on a different domain than the backend (e.g. `https://api.example.com/api/v1`). |

---

### Option A: Single-Server / Cloud VM Deployment (Docker Compose)

This is the easiest way to host the entire app on an Ubuntu/Debian VPS, AWS EC2, DigitalOcean Droplet, or local server. Nginx serves the compiled React frontend on port `8080` and reverse-proxies `/api/*` directly to the FastAPI backend container over Docker's internal network.

#### 1. Build and Start Containers
```bash
git clone https://github.com/mkidding/fbplanner.git
cd fbplanner

# Build and start in detached background mode
docker compose up -d --build
```

#### 2. Check Container Status & Logs
```bash
docker compose ps
docker compose logs -f
```

#### 3. Test the Deployed Server
```bash
# Verify health endpoint through the Nginx reverse proxy on port 8080
curl -i http://localhost:8080/api/v1/health

# Verify board & palette configuration
curl -s http://localhost:8080/api/v1/templates/config
```
Then visit **`http://<YOUR_SERVER_IP>:8080`** in your browser.

> **Production HTTPS Tip (Caddy / Nginx):**
> To expose the app on a custom domain with automatic Let's Encrypt HTTPS, point a reverse proxy like [Caddy](https://caddyserver.com/) at `localhost:8080`:
> ```caddyfile
> beads.yourdomain.com {
>     reverse_proxy localhost:8080
> }
> ```
> And add `https://beads.yourdomain.com` to `FB_CORS_ORIGINS` in `docker-compose.yml`.

---

### Option B: Managed Cloud PaaS (Split Frontend & Backend)

If you prefer serverless/managed PaaS hosting without managing a VM:

#### Step 1: Deploy Backend (`backend/`) to Render / Railway / Fly.io / Cloud Run
1. Point your cloud service to the **`backend/`** directory (using `backend/Dockerfile` or Python 3.11 buildpack).
2. Set the start command (if not using the Dockerfile):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Configure environment variables on the backend service:
   - `FB_CORS_ORIGINS=https://your-frontend-domain.vercel.app`
   - `FB_MAX_UPLOAD_BYTES=10485760`
4. Verify your deployed backend URL:
   ```bash
   curl -s https://your-backend-service.onrender.com/api/v1/health
   # Expected: {"status":"ok"}
   ```

#### Step 2: Deploy Frontend (`frontend/`) to Vercel / Netlify / Cloudflare Pages
1. Set the Root Directory to **`frontend`**.
2. Set Build Command: `npm run build` and Output Directory: `dist`.
3. Add the build-time environment variable pointing to your backend from Step 1:
   - `VITE_API_BASE_URL=https://your-backend-service.onrender.com/api/v1`
4. Deploy and open your frontend URL — uploads and template generation will communicate directly with your cloud FastAPI backend.

---

### Post-Deployment End-to-End API Smoke Test

Whether running locally or in the cloud, you can test the full image-to-bead pipeline from the command line using `curl` with any PNG/JPG file:

```bash
# Replace BASE_URL with http://127.0.0.1:8000 (local) or https://your-cloud-domain.com
BASE_URL="http://127.0.0.1:8000"

curl -X POST "${BASE_URL}/api/v1/templates/generate" \
  -F "file=@./docs/screenshots/on-board-view.png" \
  -F "target_width=36" \
  -F "target_height=36" \
  -F "palette_size=64" \
  -F "extract_foreground=true" \
  -F "preserve_aspect_ratio=true" \
  -F "contour_mode=outer-contour" \
  -F "contour_color=black" \
  | python3 -m json.tool | head -n 30
```

---

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.
