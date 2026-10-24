"""All tunable constants in one place (PRD 7.3, 8, NFR-8)."""
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
APP_DIR = ROOT_DIR / "backend" / "app"
DATA_DIR = ROOT_DIR / "data"
SIGNALS_PATH = APP_DIR / "rules" / "signals.json"
MODEL_PATH = APP_DIR / "ml" / "model.joblib"

CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

MAX_TEXT_LENGTH = 2000

# Fusion: final = 0.4 * rule_score + 0.6 * ml_probability * 100
# (v1 was 0.6 / 0.4; changed after leave-one-source-out, see docs/report_notes.md)
RULE_WEIGHT = 0.4
ML_WEIGHT = 0.6
SAFETY_FLOOR_SCORE = 70

# Risk labels: Low < 35, Medium 35..65, High > 65
LOW_MAX = 35
HIGH_MIN = 65

# Transaction rule thresholds (PRD 7.4). Weights live in signals.json.
LARGE_AMOUNT = 25_000            # full large_amount weight
MEDIUM_AMOUNT = 10_000           # half large_amount weight
NEW_PAYEE_LARGE_AMOUNT = 5_000
ODD_HOUR_END = 5                 # hours 0..4 (00:00 to 05:00) are odd hours
RAPID_TXN_COUNT = 3              # transactions in the last hour
COMMON_LIMITS = [10_000, 20_000, 25_000, 50_000, 100_000, 200_000]  # 9,999 / 49,999 sit just under these

# Allowed message scam types (FR-M9). Legit messages use "None".
SCAM_TYPES = ["Fake KYC", "Account suspension", "Lottery/prize", "OTP theft",
              "Refund/cashback", "Collect-request scam", "Other", "None"]
