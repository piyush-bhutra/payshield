"""Pydantic request/response models. Field names follow PRD section 8 exactly."""
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
