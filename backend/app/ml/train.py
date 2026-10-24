"""Train the message classifier: TF-IDF (word 1-2 grams) + Logistic Regression (PRD 7.2).

Three modes:
  python -m backend.app.ml.train
      PRD split: 70/15/15 stratified train/validation/test, seed 42. Saves the model trained on the 70%.
  python -m backend.app.ml.train --test-source gpt [--train-sources claude gemini]
      Cross-source check: train on the chosen sources (default: all others), test on the held-out
      source(s). Shows whether the model learned scams or just one generator's writing style. Not saved.
  python -m backend.app.ml.train --all
      Retrain on every row and save (for the final demo model). No evaluation.

Every evaluation prints metrics overall and per source.
"""
import argparse
import re

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from backend.app.config import DATA_DIR, MODEL_PATH
from backend.app.rules.engine import RULES

SEED = 42
FREE_MAIL = set(RULES["free_mail_domains"])


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


def report(name: str, model: Pipeline, df: pd.DataFrame) -> dict:
    """Print overall and per-source metrics for `df`; return them as a dict."""
    df = df.assign(pred=model.predict(features(df)), y=target(df))
    rows = {"all": metrics(df["y"].tolist(), df["pred"].tolist())}
    for source, part in df.groupby("source"):
        rows[source] = metrics(part["y"].tolist(), part["pred"].tolist())

    print(f"\n{name}")
    print(f"  {'source':<14}{'n':>5}{'acc':>8}{'prec':>8}{'recall':>8}{'f1':>8}   confusion [[TN,FP],[FN,TP]]")
    for source, m in rows.items():
        print(f"  {source:<14}{m['n']:>5}{m['accuracy']:>8.3f}{m['precision']:>8.3f}"
              f"{m['recall']:>8.3f}{m['f1']:>8.3f}   {m['confusion']}")
    return rows


def main(argv: list[str] | None = None) -> dict:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(DATA_DIR / "messages.csv"))
    parser.add_argument("--model-out", default=str(MODEL_PATH))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--test-source", nargs="+", help="hold out these sources as the test set")
    mode.add_argument("--all", action="store_true", help="train on every row and save; no evaluation")
    parser.add_argument("--train-sources", nargs="+", help="with --test-source: train only on these sources")
    args = parser.parse_args(argv)

    df = pd.read_csv(args.data, dtype=str, keep_default_na=False)
    print(f"Loaded {len(df)} messages from {args.data}")
    print(pd.crosstab(df["source"], df["label"]).to_string())
    model = build_pipeline()
    results: dict = {}

    if args.all:
        model.fit(features(df), target(df))
        joblib.dump(model, args.model_out)
        print(f"\nTrained on all {len(df)} rows. Saved {args.model_out}")
        return results

    if args.test_source:
        unknown = set(args.test_source) - set(df["source"])
        if unknown:
            parser.error(f"unknown source(s): {sorted(unknown)}")
        test = df[df["source"].isin(args.test_source)]
        train = df[~df["source"].isin(args.test_source)]
        if args.train_sources:
            train = train[train["source"].isin(args.train_sources)]
        print(f"\nTrain sources: {sorted(train['source'].unique())} ({len(train)} rows); "
              f"test sources: {sorted(args.test_source)} ({len(test)} rows)")
        model.fit(features(train), target(train))
        results["test"] = report("Held-out source(s)", model, test)
        print("\nModel not saved (cross-source experiment). Use the default mode or --all to save.")
        return results

    train, rest = train_test_split(df, test_size=0.30, stratify=df["label"], random_state=SEED)
    val, test = train_test_split(rest, test_size=0.50, stratify=rest["label"], random_state=SEED)
    print(f"\nSplit: train {len(train)}, validation {len(val)}, test {len(test)} (stratified, seed {SEED})")
    model.fit(features(train), target(train))
    results["validation"] = report("Validation split", model, val)
    results["test"] = report("Test split", model, test)
    joblib.dump(model, args.model_out)
    print(f"\nSaved {args.model_out}")
    return results


if __name__ == "__main__":
    main()
