"""Build the "What to do now" list from triggered signals and the risk level (FR-M7)."""
from backend.app.rules.engine import RULES
from backend.app.schemas import Signal

SIGNAL_SPECS = {**RULES["message_signals"], **RULES.get("transaction_signals", {})}


def build_advice(risk_label: str, signals: list[Signal]) -> list[str]:
    """Signal-specific advice first (signals arrive highest weight first), then the general advice for the level."""
    items = [a for s in signals for a in SIGNAL_SPECS[s.id]["advice"]]
    items += RULES["advice_by_level"][risk_label]
    return list(dict.fromkeys(items))  # de-duplicate, keep order
