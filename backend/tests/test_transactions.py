import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import TransactionRequest
from backend.app.transactions import analyze_transaction

client = TestClient(app)


def txn(**overrides) -> TransactionRequest:
    base = {"amount": 250, "payee": "Campus Canteen", "is_new_payee": False, "hour": 13,
            "type": "pay", "recent_txn_count_1h": 0}
    return TransactionRequest(**{**base, **overrides})


def ids(t: TransactionRequest) -> set[str]:
    return {s.id for s in analyze_transaction(t).signals}


def test_prd_example_is_high_100():
    r = analyze_transaction(txn(amount=49999, payee="Rahul Traders", is_new_payee=True, hour=2,
                                type="collect_request", recent_txn_count_1h=3))
    assert (r.risk_label, r.score) == ("High", 100)
    assert r.signals[0].id == "collect_request_new_payee"


def test_everyday_payment_is_low_with_no_signals():
    r = analyze_transaction(txn())
    assert (r.risk_label, r.score, r.signals) == ("Low", 0, [])
    assert r.advice


def test_large_new_payee_transfer_is_medium():
    r = analyze_transaction(txn(amount=30000, is_new_payee=True, hour=23, type="transfer"))
    assert (r.risk_label, r.score) == ("Medium", 50)


def test_late_night_burst_to_new_payee_is_high():
    r = analyze_transaction(txn(amount=9999, is_new_payee=True, hour=3, recent_txn_count_1h=4))
    assert r.risk_label == "High"
    assert ids(txn(amount=9999, is_new_payee=True, hour=3, recent_txn_count_1h=4)) == {
        "new_payee_large", "odd_hours", "rapid_repeat", "round_amount_pressure"}


@pytest.mark.parametrize("amount,weight", [(9_999.0, None), (10_000, 12), (24_999, 12), (25_000, 25)])
def test_large_amount_thresholds(amount, weight):
    sig = [s for s in analyze_transaction(txn(amount=amount)).signals if s.id == "large_amount"]
    assert (sig[0].weight if sig else None) == weight


def test_rule_boundaries():
    assert "new_payee_large" in ids(txn(amount=5000, is_new_payee=True))
    assert "new_payee_large" not in ids(txn(amount=4999, is_new_payee=True))
    assert "odd_hours" in ids(txn(hour=4))
    assert "odd_hours" not in ids(txn(hour=5))
    assert "rapid_repeat" in ids(txn(recent_txn_count_1h=3))
    assert "rapid_repeat" not in ids(txn(recent_txn_count_1h=2))
    assert "collect_request_new_payee" in ids(txn(type="collect_request", is_new_payee=True))
    assert "collect_request_new_payee" not in ids(txn(type="collect_request"))
    assert "round_amount_pressure" in ids(txn(amount=49999))
    assert "round_amount_pressure" not in ids(txn(amount=49998))


def test_transaction_endpoint_contract():
    body = {"amount": 49999, "payee": "Rahul Traders", "is_new_payee": True, "hour": 2,
            "type": "collect_request", "recent_txn_count_1h": 3}
    r = client.post("/api/analyze/transaction", json=body)
    assert r.status_code == 200
    data = r.json()
    assert set(data) == {"risk_label", "score", "signals", "advice"}
    assert (data["risk_label"], data["score"]) == ("High", 100)
    assert {"id", "title", "detail", "weight", "matched"} <= set(data["signals"][0])


@pytest.mark.parametrize("bad", [{"amount": 0}, {"hour": 24}, {"hour": -1}, {"type": "refund"}, {"payee": ""}])
def test_transaction_validation_returns_422(bad):
    body = {"amount": 100, "payee": "Shop", "is_new_payee": False, "hour": 12, "type": "pay",
            "recent_txn_count_1h": 0, **bad}
    assert client.post("/api/analyze/transaction", json=body).status_code == 422


def test_every_sample_transaction_is_scored():
    for t in client.get("/api/samples").json()["transactions"]:
        payload = {k: v for k, v in t.items() if k not in ("id", "label")}
        r = client.post("/api/analyze/transaction", json=payload).json()
        assert (r["risk_label"] == "Low") == (t["label"] == "legit"), t["id"]
