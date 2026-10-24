"""All tunable constants in one place (PRD 7.3, 8, NFR-8)."""
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
APP_DIR = ROOT_DIR / "backend" / "app"
DATA_DIR = ROOT_DIR / "data"
SIGNALS_PATH = APP_DIR / "rules" / "signals.json"
MODEL_PATH = APP_DIR / "ml" / "model.joblib"

CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

MAX_TEXT_LENGTH = 2000

# Fusion: final = 0.6 * rule_score + 0.4 * ml_probability * 100
RULE_WEIGHT = 0.6
ML_WEIGHT = 0.4
SAFETY_FLOOR_SCORE = 70

# Risk labels: Low < 35, Medium 35..65, High > 65
LOW_MAX = 35
HIGH_MIN = 65
