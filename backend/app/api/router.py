"""Top-level API v1 router."""

from fastapi import APIRouter

from app.api.endpoints.templates import router as templates_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(templates_router)


@api_router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
