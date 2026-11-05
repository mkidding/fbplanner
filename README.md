# FuseBead Studio — 52×52 Hot Melt Bead Template Creator

A modular full-stack web application that converts raw images into **52×52 Fuse Bead (Hot Melt Board)** templates with automatic foreground extraction, perceptual CIELAB quantization onto **Universal 16 / 64 / 256 Color Palettes**, and sub-pixel (`4×4` or `8×8` display pixels per bead) rounded-corner rendering.

## Project Structure

- `backend/` — **Python + FastAPI** image pipeline (`app/core/segmentation.py`, `app/core/downsampler.py`, `app/core/palettes.py`, `app/core/quantizer.py`, `app/services/template_service.py`, `app/api/endpoints/templates.py`).
- `frontend/` — **React + TypeScript + Vite + Tailwind CSS** interactive studio (`src/features/controls/`, `src/features/viewer/`, `src/features/legend/`).

## Running Locally

### 1. Start Backend (Port `8000`)
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend (Port `5173`)
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.
