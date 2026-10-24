"""Load the trained message classifier once and score messages with it (PRD 7.2)."""
from pathlib import Path

import joblib
from sklearn.pipeline import Pipeline

from backend.app.config import MODEL_PATH
from backend.app.ml.train import feature_text


def load_model(path: Path = MODEL_PATH) -> Pipeline | None:
    """Return the saved pipeline, or None if it has not been trained yet (the API then runs rule-only)."""
    return joblib.load(path) if path.exists() else None


def scam_probability(model: Pipeline, text: str, sender: str | None) -> float:
    """Probability (0-1) that the message is a scam. Only the text and the sender TYPE are used."""
    return float(model.predict_proba([feature_text(text, sender)])[0, 1])
