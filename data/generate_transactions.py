"""Simulate ~200 labelled UPI-style transactions for evaluation (PRD 9.2).

Normal behaviour: small amounts, known payees, daytime, few transactions per hour.
Injected anomalies (labelled "scam"): large amounts, new payee + large amount, 1-4 AM,
bursts, collect requests from new payees, amounts just under a limit.
Labels come from the injection step, not from the rules, so the rules can be evaluated fairly.
All payees are fictitious. Fixed seed -> same file every run.

Run: python data/generate_transactions.py
"""
import csv
import random
from pathlib import Path

SEED = 42
N_NORMAL = 160
N_PER_ANOMALY = 7  # x 6 kinds = 42 anomalies
OUT = Path(__file__).resolve().parent / "transactions.csv"

KNOWN_PAYEES = ["Campus Canteen", "Hostel Mess", "Stationery Store", "Mom", "Dad", "Roommate Arjun",
                "Metro Card Recharge", "Book Depot", "Juice Corner", "Laundry Service", "Cab Ride", "Mobile Recharge"]
NEW_PAYEES = ["Quick Loan Help", "Prize Desk 24x7", "Fast Refund Desk", "OLX Buyer Ramesh", "KYC Update Cell",
              "Lucky Draw Office", "Job Offer Registration", "Unknown UPI user4821", "Rahul Traders", "Easy Cashback"]
FIELDS = ["id", "amount", "payee", "is_new_payee", "hour", "type", "recent_txn_count_1h", "label", "anomaly"]


def normal(rng: random.Random) -> dict:
    new = rng.random() < 0.15
    return {
        "amount": rng.randint(20, 3000),
        "payee": f"New Shop {rng.randint(100, 999)}" if new else rng.choice(KNOWN_PAYEES),
        "is_new_payee": new,
        "hour": rng.randint(7, 22),
        "type": rng.choices(["pay", "transfer", "collect_request"], weights=[70, 25, 5])[0],
        "recent_txn_count_1h": rng.choices([0, 1, 2], weights=[50, 35, 15])[0],
        "label": "legit",
        "anomaly": "",
    }


def anomaly(kind: str, rng: random.Random) -> dict:
    t = normal(rng)
    t.update(label="scam", anomaly=kind)
    if kind == "large_amount":
        t.update(amount=rng.randint(25_000, 90_000), type="transfer")
    elif kind == "new_payee_large":
        t.update(amount=rng.randint(5_000, 24_000), payee=rng.choice(NEW_PAYEES), is_new_payee=True)
    elif kind == "odd_hours":
        t.update(hour=rng.randint(1, 4), amount=rng.randint(500, 8_000))
    elif kind == "burst":
        t.update(recent_txn_count_1h=rng.randint(3, 6), amount=rng.randint(500, 5_000))
    elif kind == "collect_new":
        t.update(type="collect_request", payee=rng.choice(NEW_PAYEES), is_new_payee=True,
                 amount=rng.randint(1_000, 20_000))
    elif kind == "limit_edge":
        t.update(amount=rng.choice([9_999, 19_999, 49_999]), payee=rng.choice(NEW_PAYEES), is_new_payee=True)
    return t


def generate(seed: int = SEED) -> list[dict]:
    """Return the simulated transactions (deterministic for a given seed)."""
    rng = random.Random(seed)
    kinds = ["large_amount", "new_payee_large", "odd_hours", "burst", "collect_new", "limit_edge"]
    rows = [normal(rng) for _ in range(N_NORMAL)]
    rows += [anomaly(k, rng) for k in kinds for _ in range(N_PER_ANOMALY)]
    rng.shuffle(rows)
    for i, row in enumerate(rows, 1):
        row["id"] = f"t{i:03d}"
    return rows


if __name__ == "__main__":
    rows = generate()
    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    scams = sum(r["label"] == "scam" for r in rows)
    print(f"Wrote {len(rows)} transactions ({scams} scam, {len(rows) - scams} legit) to {OUT}")
