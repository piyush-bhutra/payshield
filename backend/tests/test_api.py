from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

KYC_SCAM = {"text": "Dear customer your SBI KYC expires today. Click bit.ly/sbi-kyc now to avoid block", "sender": "+919876543210"}


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
