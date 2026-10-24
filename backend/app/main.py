"""PayShield FastAPI app. Run: python -m uvicorn backend.app.main:app --reload --port 8000"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import CORS_ORIGINS
from backend.app.schemas import HealthResponse

app = FastAPI(title="PayShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness check. model_loaded becomes real once the ML model exists (Phase 2)."""
    return HealthResponse(status="ok", model_loaded=False)
