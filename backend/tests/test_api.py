import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app import main
from backend.app.config import DATA_DIR, ML_WEIGHT, RULE_WEIGHT, SAFETY_FLOOR_SCORE
from backend.app.main import app
from backend.app.ml.train import build_pipeline, feature_text, features, target

client = TestClient(app)

KYC_SCAM = {"text": "Dear customer your SBI KYC expires today. Click bit.ly/sbi-kyc now to avoid block", "sender": "+919876543210"}
BANK_ALERT = {"text": "Rs 1,250.00 debited from A/c XX4821 on 24-10-26 to UPI merchant SWIGGY. Avl bal Rs 18,430.55. "
                      "Not you? Call 1800-000-0000. -SBI", "sender": "VM-SBIINB"}


@pytest.fixture(autouse=True)
def rule_only(monkeypatch):
    """Default: no model, so tests do not depend on whether model.joblib was trained locally."""
    monkeypatch.setattr(main, "MODEL", None)


@pytest.fixture(scope="module")
def trained_model():
    df = pd.read_csv(DATA_DIR / "messages.csv", dtype=str, keep_default_na=False)
    return build_pipeline().fit(features(df), target(df))


@pytest.fixture
def with_model(monkeypatch, trained_model):
    monkeypatch.setattr(main, "MODEL", trained_model)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert isinstance(body["model_loaded"], bool)


def test_cors_allows_frontend_origin():
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_analyze_message_contract():
    r = client.post("/api/analyze/message", json=KYC_SCAM)
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"risk_label", "score", "scam_type", "rule_score", "ml_probability",
                         "breakdown", "signals", "highlights", "advice"}
    assert body["risk_label"] == "High"
    assert body["scam_type"] == "Fake KYC"
    assert set(body["breakdown"]) == {"rule_weight", "ml_weight", "safety_floor_applied"}
    assert set(body["signals"][0]) == {"id", "title", "detail", "weight", "matched", "tip"}
    assert set(body["highlights"][0]) == {"start", "end", "signal_id"}
    assert body["advice"]


def test_legit_message_is_low_with_advice():
    r = client.post("/api/analyze/message", json={"text": "Your Amazon order has been delivered.", "sender": "AX-AMAZON"})
    body = r.json()
    assert body["risk_label"] == "Low"
    assert body["scam_type"] == "None"
    assert "When in doubt, don't pay or share." in body["advice"]


def test_sender_is_optional():
    assert client.post("/api/analyze/message", json={"text": "hello"}).status_code == 200


def test_empty_text_returns_400():
    r = client.post("/api/analyze/message", json={"text": "   "})
    assert r.status_code == 400
    assert "error" in r.json()


def test_too_long_text_returns_422():
    assert client.post("/api/analyze/message", json={"text": "a" * 2001}).status_code == 422


def test_missing_text_returns_422():
    assert client.post("/api/analyze/message", json={"sender": "x"}).status_code == 422


def test_samples():
    r = client.get("/api/samples")
    assert r.status_code == 200
    body = r.json()
    msgs, txns = body["messages"], body["transactions"]
    assert len(msgs) >= 6 and len(txns) >= 4
    assert {m["label"] for m in msgs} == {"scam", "legit"}
    assert {t["label"] for t in txns} == {"scam", "legit"}
    assert set(msgs[0]) == {"id", "label", "text", "sender"}
    assert set(txns[0]) == {"id", "label", "amount", "payee", "is_new_payee", "hour", "type", "recent_txn_count_1h"}


def test_health_reports_model_state(with_model):
    assert client.get("/api/health").json() == {"status": "ok", "model_loaded": True}


def test_rule_only_fallback_without_model():
    assert client.get("/api/health").json()["model_loaded"] is False
    body = client.post("/api/analyze/message", json=KYC_SCAM).json()
    assert body["breakdown"] == {"rule_weight": 1.0, "ml_weight": 0.0, "safety_floor_applied": False}
    assert body["ml_probability"] == 0.0
    assert body["score"] == body["rule_score"]


def test_scam_and_legit_with_model(with_model):
    scam = client.post("/api/analyze/message", json=KYC_SCAM).json()
    assert scam["breakdown"]["rule_weight"] == RULE_WEIGHT == 0.4
    assert scam["breakdown"]["ml_weight"] == ML_WEIGHT == 0.6
    assert 0.0 < scam["ml_probability"] < 1.0
    expected = min(100, round(RULE_WEIGHT * scam["rule_score"] + ML_WEIGHT * scam["ml_probability"] * 100))
    if scam["breakdown"]["safety_floor_applied"]:
        expected = SAFETY_FLOOR_SCORE
    assert scam["score"] == expected
    assert scam["risk_label"] in ("Medium", "High")

    legit = client.post("/api/analyze/message", json=BANK_ALERT).json()
    assert legit["risk_label"] == "Low"
    assert legit["scam_type"] == "None"
    assert legit["breakdown"]["ml_weight"] == 0.6


@pytest.mark.parametrize("a,b", [("+919800000001", "+919811122233"),
                                 ("9000011101", "8000044107"),
                                 ("winner123@gmail.com", "winner987@gmail.com")])
def test_sender_digits_are_never_a_feature(with_model, a, b):
    text = "Your SBI account will be blocked. Share the OTP to keep it active."
    assert feature_text(text, a) == feature_text(text, b)
    ra = client.post("/api/analyze/message", json={"text": text, "sender": a}).json()
    rb = client.post("/api/analyze/message", json={"text": text, "sender": b}).json()
    assert ra["score"] == rb["score"]
    assert ra["ml_probability"] == rb["ml_probability"]
    assert [s["id"] for s in ra["signals"]] == [s["id"] for s in rb["signals"]]


def test_message_pipeline_never_touches_the_network(with_model, monkeypatch):
    """Rules + ML + fusion + advice run with every socket entry point blocked, for messages full of links.

    Calls the endpoint function directly, because the test client's own event loop needs local sockets.
    """
    import socket
    import urllib.request

    from backend.app.schemas import MessageRequest

    def blocked(*args, **kwargs):
        raise AssertionError("network access attempted")

    for name in ("socket", "create_connection", "getaddrinfo", "gethostbyname"):
        monkeypatch.setattr(socket, name, blocked)
    monkeypatch.setattr(urllib.request, "urlopen", blocked)

    links = ["Verify now at http://192.168.10.5/login", "Claim at https://sbi-secure-kyc.top/claim",
             "KYC update: bit.ly/abc123", "Visit www.example.com or wa.me/9000012345 today"]
    for text in links:
        result = main.analyze_message(MessageRequest(text=text, sender="+919800000001"))
        assert result.breakdown.ml_weight == ML_WEIGHT  # the model really ran
        assert result.score >= 0
