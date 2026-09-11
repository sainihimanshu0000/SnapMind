# SnapMind document intelligence — training scaffold

Local-first ML path for document type classification and field extraction.
The mobile app currently uses rule-based OCR analysis (`src/documentIntelligence`).
Use this folder to collect corrections and train lightweight models offline.

## Layout

```
ml/
  README.md
  requirements.txt
  data/
    samples/          # place OCR text samples (.txt) + labels
    corrections/      # export of field_corrections from the app
  scripts/
    classify_train.py
    extract_eval.py
    export_schema.py
```

## Workflow

1. Export library JSON from SnapMind (includes `documentType` / `extractedFieldsJson`).
2. Drop OCR samples into `data/samples/` named like `ticket_001.txt`.
3. Optionally copy `field_corrections` rows into `data/corrections/corrections.jsonl`.
4. Train a simple classifier:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/classify_train.py --data data/samples --out artifacts/doc_type.joblib
python scripts/extract_eval.py --data data/samples
```

## Next models (planned)

- Document type: TF-IDF + LogisticRegression (or tiny DistilBERT later)
- Field detection: layout/OCR line labeling → BIO tags
- Confidence calibration from user corrections in `field_corrections`
