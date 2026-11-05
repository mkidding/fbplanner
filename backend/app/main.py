"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import CORS_ORIGINS


def create_app() -> FastAPI:
    app = FastAPI(
        title="Fuse Bead Template Creator API",
        description="Backend image processing pipeline for 52x52 fuse bead pegboard templates.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()
