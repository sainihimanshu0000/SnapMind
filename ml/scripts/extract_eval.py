#!/usr/bin/env python3
"""Evaluate simple regex extractors against labeled OCR samples (scaffold).

Looks for optional sidecar JSON next to each sample:
  ticket_001.txt
  ticket_001.json  -> {"ticket_number": "...", "price": "..."}
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


TICKET_NO = re.compile(
    r"(?:ticket\s*(?:no|number|#)|booking\s*id)\s*[:#-]?\s*([A-Z0-9\-]{5,})",
    re.I,
)
TOTAL = re.compile(
    r"(?:grand\s*)?total\s*[:\-]?\s*((?:₹|rs\.?|\$)?\s*[\d,]+(?:\.\d{1,2})?)",
    re.I,
)


def predict(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    m = TICKET_NO.search(text)
    if m:
        out["ticket_number"] = m.group(1)
    m = TOTAL.search(text)
    if m:
        out["total"] = re.sub(r"[^\d.]", "", m.group(1))
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    args = parser.parse_args()

    checked = 0
    hits = 0
    for path in sorted(args.data.glob("*.txt")):
        sidecar = path.with_suffix(".json")
        if not sidecar.exists():
            continue
        gold = json.loads(sidecar.read_text(encoding="utf-8"))
        pred = predict(path.read_text(encoding="utf-8"))
        for key, value in gold.items():
            checked += 1
            if pred.get(key) == value:
                hits += 1
            else:
                print(f"miss {path.name} {key}: expected={value!r} got={pred.get(key)!r}")

    if checked == 0:
        print("No labeled sidecars found. Add *.json next to OCR *.txt samples.")
        return
    print(f"field accuracy: {hits}/{checked} = {hits / checked:.3f}")


if __name__ == "__main__":
    main()
