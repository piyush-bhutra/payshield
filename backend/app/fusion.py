"""Combine the rule score and ML probability into one 0-100 score (PRD 7.3)."""
from backend.app.config import HIGH_MIN, LOW_MAX, ML_WEIGHT, RULE_WEIGHT, SAFETY_FLOOR_SCORE
from backend.app.schemas import Breakdown


def risk_label(score: int) -> str:
    """Low < 35, Medium 35..65, High > 65."""
    if score < LOW_MAX:
        return "Low"
    if score > HIGH_MIN:
        return "High"
    return "Medium"


def fuse(rule_score: int, ml_probability: float | None, signal_ids: set[str],
         weights: tuple[float, float] = (RULE_WEIGHT, ML_WEIGHT)) -> tuple[int, Breakdown]:
    """final = min(100, round(rule_weight * rule_score + ml_weight * ml_probability * 100)), plus the safety floor.

    Weights default to config (0.4 / 0.6); evaluation passes others to reproduce v1 (0.6 / 0.4).
    If no ML model is loaded (ml_probability is None) the score is rule-only and the
    breakdown says so (rule_weight 1.0, ml_weight 0.0).
    """
    if ml_probability is None:
        rule_w, ml_w, prob = 1.0, 0.0, 0.0
    else:
        (rule_w, ml_w), prob = weights, ml_probability
    score = min(100, round(rule_w * rule_score + ml_w * prob * 100))

    floor = {"credential_request", "suspicious_link"} <= signal_ids and score < SAFETY_FLOOR_SCORE
    if floor:
        score = SAFETY_FLOOR_SCORE
    return score, Breakdown(rule_weight=rule_w, ml_weight=ml_w, safety_floor_applied=floor)
