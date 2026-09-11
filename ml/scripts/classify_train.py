#!/usr/bin/env python3
"""Train a lightweight document-type classifier from OCR text samples.

Expected sample files under --data:
  ticket_001.txt, receipt_abc.txt, boarding_pass_x.txt, ...
Filename prefix before '_' is the label.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score


def load_samples(data_dir: Path) -> tuple[list[str], list[str]]:
    texts: list[str] = []
    labels: list[str] = []
    for path in sorted(data_dir.glob("*.txt")):
        label = path.stem.split("_")[0]
        texts.append(path.read_text(encoding="utf-8"))
        labels.append(label)
    return texts, labels


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    texts, labels = load_samples(args.data)
    if len(texts) < 2:
        raise SystemExit(
            f"Need at least 2 labeled .txt samples in {args.data}. "
            "Name files like ticket_001.txt / receipt_002.txt."
        )

    pipe = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )

    if len(set(labels)) > 1 and len(texts) >= 4:
        scores = cross_val_score(pipe, texts, labels, cv=min(3, len(texts)))
        print(f"cv accuracy: {scores.mean():.3f} +/- {scores.std():.3f}")
    else:
        print("Skipping CV (need more samples / classes).")

    pipe.fit(texts, labels)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    dump(pipe, args.out)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
