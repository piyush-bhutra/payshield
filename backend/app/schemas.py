"""Pydantic request/response models. Field names follow PRD section 8 exactly."""
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.config import MAX_TEXT_LENGTH

RiskLabel = Literal["Low", "Medium", "High"]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class MessageRequest(BaseModel):
    text: str = Field(max_length=MAX_TEXT_LENGTH)
    sender: str | None = Field(default=None, max_length=200)


class Signal(BaseModel):
    id: str
    title: str
    detail: str
    weight: int
    matched: list[str]
    tip: str | None = None


class Highlight(BaseModel):
    start: int
    end: int
    signal_id: str


class Breakdown(BaseModel):
    rule_weight: float
    ml_weight: float
    safety_floor_applied: bool


class MessageResponse(BaseModel):
    risk_label: RiskLabel
    score: int
    scam_type: str
    rule_score: int
    ml_probability: float
    breakdown: Breakdown
    signals: list[Signal]
    highlights: list[Highlight]
    advice: list[str]


class ErrorResponse(BaseModel):
    error: str


class MessageSample(BaseModel):
    id: str
    label: Literal["scam", "legit"]
    text: str
    sender: str


class TransactionRequest(BaseModel):
    amount: float = Field(gt=0, le=100_000_000)
    payee: str = Field(min_length=1, max_length=100)
    is_new_payee: bool
    hour: int = Field(ge=0, le=23)
    type: Literal["pay", "collect_request", "transfer"]
    recent_txn_count_1h: int = Field(ge=0, le=1000)


class TransactionResponse(BaseModel):
    risk_label: RiskLabel
    score: int
    signals: list[Signal]
    advice: list[str]


class TransactionSample(TransactionRequest):
    id: str
    label: Literal["scam", "legit"]


class SamplesResponse(BaseModel):
    messages: list[MessageSample]
    transactions: list[TransactionSample]
