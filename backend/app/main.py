"""PayShield FastAPI app. Run: python -m uvicorn backend.app.main:app --reload --port 8000"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.advice import build_advice
from backend.app.config import CORS_ORIGINS, DATA_DIR
from backend.app.fusion import fuse, risk_label
from backend.app.ml.predict import load_model, scam_probability
from backend.app.rules import engine
from backend.app.schemas import (
    ErrorResponse,
    HealthResponse,
    MessageRequest,
    MessageResponse,
    SamplesResponse,
    TransactionRequest,
    TransactionResponse,
)
from backend.app.transactions import analyze_transaction as score_transaction

app = FastAPI(title="PayShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SAMPLES = SamplesResponse.model_validate_json((DATA_DIR / "samples.json").read_text(encoding="utf-8"))
MODEL = load_model()  # loaded once at startup (NFR-4); None -> rule-only until `python -m backend.app.ml.train --all`


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness check; model_loaded says whether the ML model is in use."""
    return HealthResponse(status="ok", model_loaded=MODEL is not None)


@app.post("/api/analyze/message", response_model=MessageResponse, responses={400: {"model": ErrorResponse}})
def analyze_message(req: MessageRequest):
    """Analyse a message: rule signals + ML probability -> fused score, label, advice."""
    if not req.text.strip():
        return JSONResponse(status_code=400, content={"error": "Message text is empty."})

    rules = engine.analyze_message(req.text, req.sender)
    ml_probability = scam_probability(MODEL, req.text, req.sender) if MODEL is not None else None
    score, breakdown = fuse(rules.rule_score, ml_probability, {s.id for s in rules.signals})
    label = risk_label(score)
    return MessageResponse(
        risk_label=label,
        score=score,
        scam_type=rules.scam_type if label != "Low" else "None",
        rule_score=rules.rule_score,
        ml_probability=ml_probability or 0.0,
        breakdown=breakdown,
        signals=rules.signals,
        highlights=rules.highlights,
        advice=build_advice(label, rules.signals),
    )


@app.post("/api/analyze/transaction", response_model=TransactionResponse)
def analyze_transaction(req: TransactionRequest) -> TransactionResponse:
    """Analyse one transaction with the rule set from PRD 7.4. Invalid input -> 422."""
    return score_transaction(req)


@app.get("/api/samples", response_model=SamplesResponse)
def samples() -> SamplesResponse:
    """Demo messages and transactions for the sample loader and example chips (FR-C1, FR-C7)."""
    return SAMPLES
