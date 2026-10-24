"""Merge, clean and validate message CSVs into data/messages.csv.

Each input CSV needs the columns: id,text,sender,label,scam_type,tags,source
With no file arguments, every CSV in data/raw/ is read, in filename order.

Steps:
1. Normalise text (Unicode NFKC, collapse whitespace).
2. Validate: non-empty text, unique id, label scam/legit, scam_type from the PRD FR-M9 list
   (legit rows must be "None").
3. Drop exact duplicates, then near-duplicates (TF-IDF cosine similarity > threshold).
   The first occurrence wins, so file order is priority order. Dropping near-duplicates
   across sources also stops the same message leaking from training into a held-out source.
   Rows that near-duplicate a case in data/adversarial_tests.csv are dropped too, so the
   adversarial set stays fully unseen (PRD 9.3).
4. Print counts per source, label and scam_type, and how many rows were dropped and why.

Run: python data/validate_dataset.py [files...] [--threshold 0.8] [--out data/messages.csv]
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

    problems, keep, seen_ids = [], [], set()
    for row in df.itertuples():
        reason = None
        if not row.text:
            reason = "empty text"
        elif not row.id:
            reason = "empty id"
        elif row.id in seen_ids:
            reason = f"duplicate id '{row.id}'"
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
        else:
            seen_ids.add(row.id)
        keep.append(reason is None)
    return df[keep].reset_index(drop=True), problems


def drop_duplicates(df: pd.DataFrame, threshold: float,
                    protected: pd.DataFrame | None = None) -> tuple[pd.DataFrame, int, list[str]]:
    """Drop exact then near-duplicate texts, keeping the first occurrence.

    `protected` rows (the adversarial set) count as already kept: messages too close to
    them are dropped, and they are never written out.
    Returns (kept rows, exact count, near-duplicate descriptions).
    """
    protected = protected if protected is not None else df.iloc[0:0]
    combined = pd.concat([protected[["id", "text", "source"]], df], ignore_index=True)
    n_protected = len(protected)

    exact = combined["text"].str.lower().duplicated()
    exact[:n_protected] = False
    combined = combined[~exact].reset_index(drop=True)

    vectors = TfidfVectorizer(ngram_range=(1, 2)).fit_transform(combined["text"].str.lower())
    sims = (vectors @ vectors.T).toarray()  # rows are L2-normalised, so this is cosine similarity
    # ponytail: dense n x n matrix, fine for a few thousand rows; chunk it if the dataset grows past ~10k.
    kept: list[int] = list(range(n_protected))
    near: list[str] = []
    for i in range(n_protected, len(combined)):
        match = next((j for j in kept if sims[i, j] > threshold), None)
        if match is None:
            kept.append(i)
        else:
            near.append(f"{combined.at[i, 'id']} [{combined.at[i, 'source']}] ~ {combined.at[match, 'id']} "
                        f"[{combined.at[match, 'source']}] (similarity {sims[i, match]:.2f})")
    return combined.iloc[kept[n_protected:]][df.columns].reset_index(drop=True), int(exact.sum()), near


def main(argv: list[str] | None = None) -> pd.DataFrame:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv", nargs="*", type=Path, help="input CSVs in priority order (default: data/raw/*.csv)")
    parser.add_argument("--threshold", type=float, default=0.8, help="near-duplicate cosine similarity (default 0.8)")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "messages.csv")
    parser.add_argument("--adversarial", type=Path, default=ROOT / "data" / "adversarial_tests.csv",
                        help="cases kept out of training (skipped if the file does not exist)")
    args = parser.parse_args(argv)

    files = args.csv or sorted((ROOT / "data" / "raw").glob("*.csv"))
    if not files:
        sys.exit("ERROR: no input CSVs (data/raw/ is empty).")
    raw = load(files)
    valid, problems = validate_rows(raw)

    protected = None
    if args.adversarial.exists():
        protected = pd.read_csv(args.adversarial, dtype=str, keep_default_na=False)
        protected = protected.assign(text=protected["text"].map(normalise), source="adversarial",
                                     id=protected.get("id", pd.Series(range(len(protected)))).astype(str))
        print(f"Protecting {len(protected)} adversarial cases from {args.adversarial}")
    clean, n_exact, near = drop_duplicates(valid, args.threshold, protected)

    print(f"Loaded {len(raw)} rows from {len(files)} file(s): {', '.join(f.name for f in files)}")
    print(f"Dropped {len(problems)} invalid, {n_exact} exact duplicates, {len(near)} near-duplicates "
          f"(similarity > {args.threshold}). Kept {len(clean)}.")
    for title, lines in (("Invalid rows", problems), ("Near-duplicates (dropped ~ kept)", near)):
        if lines:
            print(f"\n{title}:")
            print("\n".join(f"  {line}" for line in lines))

    print("\nRows per source and label:")
    print(pd.crosstab(clean["source"], clean["label"], margins=True, margins_name="total").to_string())
    print("\nRows per scam_type and source:")
    print(pd.crosstab(clean["scam_type"], clean["source"], margins=True, margins_name="total").to_string())

    args.out.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(args.out, index=False)
    print(f"\nWrote {args.out}")
    return clean


if __name__ == "__main__":
    main()
