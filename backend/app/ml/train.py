"""Train the message classifier: TF-IDF (word 1-2 grams) + Logistic Regression (PRD 7.2).

Three modes:
  python -m backend.app.ml.train
      PRD split: 70/15/15 stratified train/validation/test, seed 42. Saves the model trained on the 70%.
  python -m backend.app.ml.train --train-sources claude,gemini --test-source gpt
      Cross-source check: train on the chosen sources (default: all others), test on the held-out
      source(s). Shows whether the model learned scams or one generator's writing style. Not saved.
  python -m backend.app.ml.train --all
      Retrain on every row and save (the final demo model).

Every evaluation prints metrics overall and per source. The adversarial set
(data/adversarial_tests.csv) is never trained on and is scored only with --all. Each set is scored four ways:
  rules        rule_score >= 35
  ML           ml_probability >= 0.5
  hybrid M+H   final score >= 35  (Medium or High counts as flagged)
  hybrid High  final score > 65   (strict: only High counts as flagged)
"""
import argparse
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from backend.app.config import DATA_DIR, MODEL_PATH
from backend.app.fusion import fuse, risk_label
from backend.app.rules.engine import RULES, analyze_message

SEED = 42
FREE_MAIL = set(RULES["free_mail_domains"])
METHODS = {
    "rules": lambda d: d["rule_label"] != "Low",
    "ML": lambda d: d["ml_probability"] >= 0.5,
    "hybrid M+H": lambda d: d["label_pred"] != "Low",
    "hybrid High": lambda d: d["label_pred"] == "High",
}


def sender_type(sender: str | None) -> str:
    """Coarse sender kind: phone, shortnumber, shortcode, freemail, email or none."""
    s = (sender or "").strip().lower()
    if not s:
        return "none"
    if "@" in s:
        return "freemail" if s.split("@")[-1] in FREE_MAIL else "email"
    digits = re.sub(r"[\s+()-]", "", s)
    if digits.isdigit():
        return "phone" if len(digits) >= 10 else "shortnumber"
    return "shortcode"


def feature_text(text: str, sender: str | None) -> str:
    """Message text plus a sender-type token, e.g. '... sender_phone'. Shared by training and prediction."""
    return f"{text} sender_{sender_type(sender)}"


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=1)),
        ("clf", LogisticRegression(class_weight="balanced", random_state=SEED, max_iter=1000)),
    ])


def features(df: pd.DataFrame) -> list[str]:
    return [feature_text(t, s) for t, s in zip(df["text"], df["sender"])]


def target(df: pd.DataFrame) -> list[int]:
    return (df["label"] == "scam").astype(int).tolist()


def metrics(y_true: list[int], y_pred: list[int]) -> dict:
    """Accuracy plus precision/recall/F1 for the scam class, and the confusion matrix [[TN, FP], [FN, TP]]."""
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", pos_label=1, zero_division=0)
    return {"n": len(y_true), "accuracy": accuracy_score(y_true, y_pred), "precision": p, "recall": r, "f1": f,
            "confusion": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()}


def score(model: Pipeline, df: pd.DataFrame, weights: tuple[float, float] | None = None) -> pd.DataFrame:
    """Add rule score, ML probability and the fused score/label (PRD 7.3) to every row.

    `weights` overrides the config fusion weights (used by eval/evaluate.py to reproduce v1).
    """
    probs = model.predict_proba(features(df))[:, 1]
    rule_scores, final_scores = [], []
    for text, sender, p in zip(df["text"], df["sender"], probs):
        r = analyze_message(text, sender)
        ids = {s.id for s in r.signals}
        final, _ = fuse(r.rule_score, float(p), ids, weights) if weights else fuse(r.rule_score, float(p), ids)
        rule_scores.append(r.rule_score)
        final_scores.append(final)
    return df.assign(y=target(df), ml_probability=probs, rule_score=rule_scores, score=final_scores,
                     rule_label=[risk_label(s) for s in rule_scores],
                     label_pred=[risk_label(s) for s in final_scores])


def report(name: str, model: Pipeline, df: pd.DataFrame) -> dict:
    """Print metrics for every method, overall and per source; return {group: {method: metrics}}."""
    scored = score(model, df)
    groups = [("all", scored)] + ([(s, part) for s, part in scored.groupby("source")]
                                  if scored["source"].nunique() > 1 else [])
    results: dict = {}
    print(f"\n{name} ({len(df)} rows)")
    print(f"  {'source':<12}{'method':<13}{'n':>5}{'acc':>7}{'prec':>7}{'recall':>8}{'f1':>7}   [[TN,FP],[FN,TP]]")
    for group, part in groups:
        results[group] = {}
        for method, flagged in METHODS.items():
            m = metrics(part["y"].tolist(), flagged(part).astype(int).tolist())
            results[group][method] = m
            print(f"  {group:<12}{method:<13}{m['n']:>5}{m['accuracy']:>7.3f}{m['precision']:>7.3f}"
                  f"{m['recall']:>8.3f}{m['f1']:>7.3f}   {m['confusion']}")
    return results


def print_cases(name: str, scored: pd.DataFrame) -> None:
    """One line per message: label, rule score, ML probability, final score, risk label, correct or not."""
    print(f"\n{name}")
    print(f"  {'id':<7}{'label':<7}{'rule':>5}{'ML p':>7}{'final':>7}  {'risk':<8}correct")
    for r in scored.itertuples():
        correct = (r.label_pred != "Low") == (r.label == "scam")
        print(f"  {r.id:<7}{r.label:<7}{r.rule_score:>5}{r.ml_probability:>7.2f}{r.score:>7}  {r.label_pred:<8}"
              f"{'Y' if correct else 'N'}")


def _sources(values: list[str] | None) -> list[str] | None:
    """Accept both 'claude,gemini' and 'claude gemini'."""
    return [s for v in values for s in v.split(",") if s] if values else None


def main(argv: list[str] | None = None) -> dict:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(DATA_DIR / "messages.csv"))
    parser.add_argument("--adversarial", default=str(DATA_DIR / "adversarial_tests.csv"))
    parser.add_argument("--model-out", default=str(MODEL_PATH))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--test-source", nargs="+", help="hold out these sources as the test set (comma or space separated)")
    mode.add_argument("--all", action="store_true", help="train on every row and save")
    parser.add_argument("--train-sources", nargs="+", help="with --test-source: train only on these sources")
    args = parser.parse_args(argv)
    test_sources, train_sources = _sources(args.test_source), _sources(args.train_sources)

    df = pd.read_csv(args.data, dtype=str, keep_default_na=False)
    print(f"Loaded {len(df)} messages from {args.data}")
    print(pd.crosstab(df["source"], df["label"]).to_string())
    for given in (test_sources or []) + (train_sources or []):
        if given not in set(df["source"]):
            parser.error(f"unknown source '{given}'. Known: {sorted(df['source'].unique())}")
    if train_sources and not test_sources:
        parser.error("--train-sources needs --test-source")

    model = build_pipeline()
    results: dict = {}
    save = True
    if args.all:
        model.fit(features(df), target(df))
        print(f"\nTrained on all {len(df)} rows.")
    elif test_sources:
        test = df[df["source"].isin(test_sources)]
        train = df[~df["source"].isin(test_sources)]
        if train_sources:
            train = train[train["source"].isin(train_sources)]
        print(f"\nTrain: {sorted(train['source'].unique())} ({len(train)} rows). "
              f"Test: {sorted(test_sources)} ({len(test)} rows).")
        model.fit(features(train), target(train))
        results["test"] = report("Held-out source(s)", model, test)
        save = False
    else:
        train, rest = train_test_split(df, test_size=0.30, stratify=df["label"], random_state=SEED)
        val, test = train_test_split(rest, test_size=0.50, stratify=rest["label"], random_state=SEED)
        print(f"\nSplit: train {len(train)}, validation {len(val)}, test {len(test)} (stratified, seed {SEED})")
        model.fit(features(train), target(train))
        results["validation"] = report("Validation split", model, val)
        results["test"] = report("Test split", model, test)

    # The adversarial set is a held-out stress test: only the final --all model is scored on it,
    # never experiments, and only text + sender are used (the notes column is for humans).
    if args.all and Path(args.adversarial).exists():
        adv = pd.read_csv(args.adversarial, dtype=str, keep_default_na=False)[["id", "text", "sender", "label", "source"]]
        print_cases("Adversarial set, per case (correct = flagged Medium/High for scam, Low for legit)",
                    score(model, adv))
        results["adversarial"] = report("Adversarial set", model, adv)
    elif args.all:
        print(f"\n(No adversarial set at {args.adversarial}; skipped.)")

    if save:
        joblib.dump(model, args.model_out)
        print(f"\nSaved {args.model_out}")
    else:
        print("\nModel not saved (cross-source experiment). Use the default mode or --all to save.")
    return results


if __name__ == "__main__":
    main()
