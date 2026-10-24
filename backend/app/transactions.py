"""Transaction rules (PRD 7.4): threshold checks -> signals, score, risk label, advice."""
from backend.app.advice import build_advice
from backend.app.config import (
    COMMON_LIMITS,
    LARGE_AMOUNT,
    MEDIUM_AMOUNT,
    NEW_PAYEE_LARGE_AMOUNT,
    ODD_HOUR_END,
    RAPID_TXN_COUNT,
)
from backend.app.fusion import risk_label
from backend.app.rules.engine import RULES
from backend.app.schemas import Signal, TransactionRequest, TransactionResponse

TXN_SIGNALS: dict = RULES["transaction_signals"]


def _signal(sid: str, matched: list[str], weight: int | None = None) -> Signal:
    spec = TXN_SIGNALS[sid]
    return Signal(id=sid, title=spec["title"], detail=spec["explanation"],
                  weight=spec["weight"] if weight is None else weight, matched=matched, tip=spec["tip"])


def find_signals(t: TransactionRequest) -> list[Signal]:
    """Apply every transaction rule; return triggered signals, highest weight first."""
    amount = f"Rs {t.amount:,.0f}"
    signals = []
    if t.amount >= LARGE_AMOUNT:
        signals.append(_signal("large_amount", [amount]))
    elif t.amount >= MEDIUM_AMOUNT:
        signals.append(_signal("large_amount", [amount], weight=TXN_SIGNALS["large_amount"]["weight"] // 2))
    if t.is_new_payee and t.amount >= NEW_PAYEE_LARGE_AMOUNT:
        signals.append(_signal("new_payee_large", [f"new payee: {t.payee}", amount]))
    if t.hour < ODD_HOUR_END:
        signals.append(_signal("odd_hours", [f"{t.hour:02d}:00"]))
    if t.recent_txn_count_1h >= RAPID_TXN_COUNT:
        signals.append(_signal("rapid_repeat", [f"{t.recent_txn_count_1h} transactions in the last hour"]))
    if t.type == "collect_request" and t.is_new_payee:
        signals.append(_signal("collect_request_new_payee", [f"collect request from new payee: {t.payee}"]))
    if t.amount + 1 in COMMON_LIMITS:
        signals.append(_signal("round_amount_pressure", [amount]))
    return sorted(signals, key=lambda s: -s.weight)


def analyze_transaction(t: TransactionRequest) -> TransactionResponse:
    """Score a transaction: sum of triggered weights, capped at 100, same Low/Medium/High thresholds."""
    signals = find_signals(t)
    score = min(100, sum(s.weight for s in signals))
    label = risk_label(score)
    return TransactionResponse(risk_label=label, score=score, signals=signals, advice=build_advice(label, signals))
