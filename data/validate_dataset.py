"""Merge, clean and validate message CSVs into data/messages.csv.

Each input CSV needs the columns: id,text,sender,label,scam_type,tags,source

Steps:
1. Normalise text (Unicode NFKC, collapse whitespace).
2. Validate label (scam/legit) and scam_type (PRD FR-M9 list; legit rows must be "None").
3. Drop exact duplicates, then near-duplicates (TF-IDF cosine similarity > threshold).
   The first occurrence wins, so list the files in priority order. Dropping near-duplicates
   across sources also stops the same message leaking from training into a held-out source.
4. Print counts per source and label, and how many rows were dropped and why.

Run: python data/validate_dataset.py data/raw/claude.csv data/raw/gpt.csv [--threshold 0.8] [--out data/messages.csv]
"""
import argparse
import re
import sys
import unicodedata
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.config import SCAM_TYPES  # noqa: E402

COLUMNS = ["id", "text", "sender", "label", "scam_type", "tags", "source"]
CANONICAL_TYPES = {t.lower(): t for t in SCAM_TYPES}


def normalise(text: str) -> str:
    """NFKC-normalise and collapse all whitespace to single spaces."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(text))).strip()


def load(paths: list[Path]) -> pd.DataFrame:
    frames = []
    for p in paths:
        df = pd.read_csv(p, dtype=str, keep_default_na=False)
        missing = set(COLUMNS) - set(df.columns)
        if missing:
            sys.exit(f"ERROR: {p} is missing columns: {sorted(missing)}")
        frames.append(df[COLUMNS])
    return pd.concat(frames, ignore_index=True)


def validate_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Normalise fields and return (valid rows, list of 'id: reason' problems)."""
    df = df.copy()
    for col in COLUMNS:
        df[col] = df[col].map(normalise)
    df["label"] = df["label"].str.lower()
    df["scam_type"] = df["scam_type"].map(lambda s: CANONICAL_TYPES.get((s or "None").lower(), s))

    problems, keep = [], []
    for row in df.itertuples():
        reason = None
        if not row.text:
            reason = "empty text"
        elif row.label not in ("scam", "legit"):
            reason = f"bad label '{row.label}'"
        elif row.scam_type not in SCAM_TYPES:
            reason = f"bad scam_type '{row.scam_type}'"
        elif row.label == "legit" and row.scam_type != "None":
            reason = f"legit row has scam_type '{row.scam_type}'"
        elif row.label == "scam" and row.scam_type == "None":
            reason = "scam row has scam_type 'None'"
        elif not row.source:
            reason = "empty source"
        if reason:
            problems.append(f"{row.id or '(no id)'} [{row.source}]: {reason}")
        keep.append(reason is None)
    return df[keep].reset_index(drop=True), problems


def drop_duplicates(df: pd.DataFrame, threshold: float) -> tuple[pd.DataFrame, int, list[str]]:
    """Drop exact then near-duplicate texts, keeping the first occurrence.

    Returns (kept rows, exact count, near-duplicate descriptions).
    """
    key = df["text"].str.lower()
    exact = key.duplicated()
    df = df[~exact].reset_index(drop=True)

    vectors = TfidfVectorizer(ngram_range=(1, 2)).fit_transform(df["text"].str.lower())
    sims = (vectors @ vectors.T).toarray()  # rows are L2-normalised, so this is cosine similarity
    # ponytail: dense n x n matrix, fine for a few thousand rows; chunk it if the dataset grows past ~10k.
    kept: list[int] = []
    near: list[str] = []
    for i in range(len(df)):
        match = next((j for j in kept if sims[i, j] > threshold), None)
        if match is None:
            kept.append(i)
        else:
            near.append(f"{df.at[i, 'id']} [{df.at[i, 'source']}] ~ {df.at[match, 'id']} "
                        f"[{df.at[match, 'source']}] (similarity {sims[i, match]:.2f})")
    return df.iloc[kept].reset_index(drop=True), int(exact.sum()), near


def main(argv: list[str] | None = None) -> pd.DataFrame:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv", nargs="+", type=Path, help="input CSVs, in priority order")
    parser.add_argument("--threshold", type=float, default=0.8, help="near-duplicate cosine similarity (default 0.8)")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "messages.csv")
    args = parser.parse_args(argv)

    raw = load(args.csv)
    valid, problems = validate_rows(raw)
    clean, n_exact, near = drop_duplicates(valid, args.threshold)

    print(f"Loaded {len(raw)} rows from {len(args.csv)} file(s).")
    print(f"Dropped {len(problems)} invalid, {n_exact} exact duplicates, {len(near)} near-duplicates "
          f"(similarity > {args.threshold}). Kept {len(clean)}.")
    for title, lines in (("Invalid rows", problems), ("Near-duplicates (dropped ~ kept)", near)):
        if lines:
            print(f"\n{title}:")
            print("\n".join(f"  {line}" for line in lines))

    print("\nRows per source and label:")
    print(pd.crosstab(clean["source"], clean["label"], margins=True, margins_name="total").to_string())
    print("\nRows per scam_type:")
    print(clean["scam_type"].value_counts().to_string())

    args.out.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(args.out, index=False)
    print(f"\nWrote {args.out}")
    return clean


if __name__ == "__main__":
    main()
