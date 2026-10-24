"""Regenerate every evaluation result from the committed data and model (PRD 12, FR-C2).

Run from the repo root:  python eval/evaluate.py

Writes to eval/results/:
  metrics.json                        all numbers below
  test_table.csv, test_table.md       per-case table: 20 adversarial messages + 8 transactions
  confusion_matrix_messages.png       adversarial set, hybrid (Medium or High = flagged)
  confusion_matrix_transactions.png   simulated transactions, rules (Medium or High = flagged)

Sections (same method as docs/evaluation.md):
  1. v1 held-out: train on claude + gemini, test on gpt, weights 0.6 / 0.4
  2. leave-one-source-out over claude, gemini, gpt for weights 0.6/0.4, 0.5/0.5, 0.4/0.6, 0.3/0.7
  3. final independent test: the committed model on data/adversarial_tests.csv
  4. transaction rules on data/transactions.csv
Training is deterministic (seed 42), so re-running reproduces the recorded numbers.
Nothing here opens a URL or touches the network.
"""
import csv
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # file output only, no window
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.config import DATA_DIR, ML_WEIGHT, RULE_WEIGHT  # noqa: E402
from backend.app.fusion import risk_label  # noqa: E402
from backend.app.ml.predict import load_model  # noqa: E402
from backend.app.ml.train import METHODS, build_pipeline, features, metrics, score, target  # noqa: E402
from backend.app.rules.engine import RULES  # noqa: E402
from backend.app.schemas import TransactionRequest  # noqa: E402
from backend.app.transactions import analyze_transaction  # noqa: E402

RESULTS = ROOT / "eval" / "results"
SOURCES = ["claude", "gemini", "gpt"]
SWEEP = [(0.6, 0.4), (0.5, 0.5), (0.4, 0.6), (0.3, 0.7)]
V1_WEIGHTS = (0.6, 0.4)


def method_metrics(scored: pd.DataFrame, methods=METHODS) -> dict:
    """Metrics for each flagging method, plus the false-alarm rate (share of legit rows flagged)."""
    out = {}
    for name, flagged in methods.items():
        m = metrics(scored["y"].tolist(), flagged(scored).astype(int).tolist())
        (tn, fp), _ = m["confusion"]
        out[name] = {**m, "false_alarm_rate": fp / (tn + fp) if tn + fp else 0.0}
    return out


def held_out(messages: pd.DataFrame, test_source: str, weights: tuple[float, float]) -> pd.DataFrame:
    train = messages[messages["source"] != test_source]
    test = messages[messages["source"] == test_source]
    model = build_pipeline().fit(features(train), target(train))
    return score(model, test, weights)


def v1_result(messages: pd.DataFrame) -> dict:
    return method_metrics(held_out(messages, "gpt", V1_WEIGHTS))


def loso_sweep(messages: pd.DataFrame) -> dict:
    hybrid = {"hybrid M+H": METHODS["hybrid M+H"]}
    folds = {f"{wr}/{wm}": {s: method_metrics(held_out(messages, s, (wr, wm)), hybrid)["hybrid M+H"] for s in SOURCES}
             for wr, wm in SWEEP}
    for per_fold in folds.values():
        per_fold["average"] = {k: sum(per_fold[s][k] for s in SOURCES) / len(SOURCES)
                               for k in ("precision", "recall", "f1", "false_alarm_rate")}
    return folds


def adversarial(model) -> tuple[dict, list[dict]]:
    adv = pd.read_csv(DATA_DIR / "adversarial_tests.csv", dtype=str, keep_default_na=False)
    scored = score(model, adv[["id", "text", "sender", "label", "source"]])  # notes column is never used
    rows = [{"case": r.id, "kind": "message", "expected": r.label, "rule_score": r.rule_score,
             "ml_probability": round(r.ml_probability, 2), "final_score": r.score, "risk": r.label_pred,
             "correct": "Y" if (r.label_pred != "Low") == (r.label == "scam") else "N",
             "text": r.text[:80] + ("..." if len(r.text) > 80 else "")} for r in scored.itertuples()]
    result = method_metrics(scored)
    result["risk_label_counts"] = scored["label_pred"].value_counts().to_dict()
    result["medium_zone_advice"] = RULES["advice_by_level"]["Medium"]
    return result, rows


def transactions() -> tuple[dict, list[dict]]:
    with open(DATA_DIR / "transactions.csv", newline="", encoding="utf-8") as f:
        data = list(csv.DictReader(f))
    results = []
    for t in data:
        req = TransactionRequest(amount=float(t["amount"]), payee=t["payee"], is_new_payee=t["is_new_payee"] == "True",
                                 hour=int(t["hour"]), type=t["type"], recent_txn_count_1h=int(t["recent_txn_count_1h"]))
        results.append((t, analyze_transaction(req)))
    y = [int(t["label"] == "scam") for t, _ in results]
    pred = [int(r.risk_label != "Low") for _, r in results]
    by_anomaly: dict = {}
    for t, r in results:
        key = t["anomaly"] or "normal"
        by_anomaly.setdefault(key, {"Low": 0, "Medium": 0, "High": 0})[r.risk_label] += 1
    summary = {**metrics(y, pred), "risk_by_anomaly": by_anomaly,
               "false_alarms": [t["id"] for (t, r), yi in zip(results, y) if not yi and r.risk_label != "Low"]}
    # Test-table cases: first legit row, then the first row of each anomaly kind, then a second legit row.
    picks, seen = [], set()
    for t, r in results:
        key = t["anomaly"] or "normal"
        if key not in seen or (key == "normal" and sum(p[0]["anomaly"] == "" for p in picks) < 2):
            picks.append((t, r))
            seen.add(key)
    rows = [{"case": t["id"], "kind": "transaction", "expected": t["label"], "rule_score": r.score,
             "ml_probability": "", "final_score": r.score, "risk": r.risk_label,
             "correct": "Y" if (r.risk_label != "Low") == (t["label"] == "scam") else "N",
             "text": f"Rs {t['amount']} to {t['payee']}, new payee {t['is_new_payee']}, {t['hour']}:00, "
                     f"{t['type']}, {t['recent_txn_count_1h']} in last hour"} for t, r in picks]
    return summary, rows


def plot_confusion(matrix: list[list[int]], title: str, path: Path) -> None:
    fig, ax = plt.subplots(figsize=(4, 3.6))
    ax.imshow(matrix, cmap="Blues")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, matrix[i][j], ha="center", va="center", fontsize=16,
                    color="white" if matrix[i][j] > max(map(max, matrix)) / 2 else "black")
    ax.set_xticks([0, 1], ["legit", "scam"])
    ax.set_yticks([0, 1], ["legit", "scam"])
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title, fontsize=10)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def write_table(rows: list[dict]) -> None:
    cols = list(rows[0])
    with open(RESULTS / "test_table.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=cols)
        writer.writeheader()
        writer.writerows(rows)
    lines = ["| " + " | ".join(cols) + " |", "|" + " --- |" * len(cols)]
    lines += ["| " + " | ".join(str(r[c]).replace("|", "/") for c in cols) + " |" for r in rows]
    (RESULTS / "test_table.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> dict:
    RESULTS.mkdir(parents=True, exist_ok=True)
    messages = pd.read_csv(DATA_DIR / "messages.csv", dtype=str, keep_default_na=False)
    model = load_model()
    if model is None:
        sys.exit("ERROR: backend/app/ml/model.joblib missing. Run: python -m backend.app.ml.train --all")

    adv, adv_rows = adversarial(model)
    txn, txn_rows = transactions()
    results = {
        "fusion_weights": {"rule_weight": RULE_WEIGHT, "ml_weight": ML_WEIGHT},
        "dataset": {"messages_by_source_label": pd.crosstab(messages["source"], messages["label"]).to_dict("index"),
                    "transactions": {"total": txn["n"], "scam": sum(txn["confusion"][1]), "legit": sum(txn["confusion"][0])}},
        "v1_gpt_held_out": v1_result(messages),
        "leave_one_source_out": loso_sweep(messages),
        "adversarial_final": adv,
        "transactions": txn,
    }
    (RESULTS / "metrics.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    write_table(adv_rows + txn_rows)
    plot_confusion(adv["hybrid M+H"]["confusion"], "Adversarial set: hybrid (Medium/High = scam)",
                   RESULTS / "confusion_matrix_messages.png")
    plot_confusion(txn["confusion"], "Transactions: rules (Medium/High = scam)",
                   RESULTS / "confusion_matrix_transactions.png")

    v1 = results["v1_gpt_held_out"]
    print(f"v1 GPT held-out (0.6/0.4): hybrid acc {v1['hybrid M+H']['accuracy']:.2f} recall {v1['hybrid M+H']['recall']:.2f}; "
          f"ML acc {v1['ML']['accuracy']:.2f} recall {v1['ML']['recall']:.2f} FP {v1['ML']['confusion'][0][1]}; "
          f"rules recall {v1['rules']['recall']:.2f}")
    print("Leave-one-source-out averages (hybrid, Medium or High):")
    for w, folds in results["leave_one_source_out"].items():
        a = folds["average"]
        print(f"  {w}: precision {a['precision']:.3f} recall {a['recall']:.3f} f1 {a['f1']:.3f} "
              f"false alarms {a['false_alarm_rate']:.1%}")
    print("Adversarial (final model):")
    for name in METHODS:
        m = adv[name]
        print(f"  {name:<12} acc {m['accuracy']:.2f} prec {m['precision']:.2f} recall {m['recall']:.2f} "
              f"f1 {m['f1']:.2f} {m['confusion']}")
    print(f"Transactions (rules): precision {txn['precision']:.3f} recall {txn['recall']:.3f} f1 {txn['f1']:.3f} "
          f"{txn['confusion']}, false alarms {txn['false_alarms']}")
    print(f"Wrote {', '.join(sorted(p.name for p in RESULTS.iterdir() if p.name != '.gitkeep'))} to {RESULTS}")
    return results


if __name__ == "__main__":
    main()
