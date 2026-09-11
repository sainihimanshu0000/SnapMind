#!/usr/bin/env python3
"""Print the JSON schema SnapMind uses for document analysis + corrections."""

import json

SCHEMA = {
    "DocumentAnalysis": {
        "documentType": "ticket|receipt|invoice|boarding_pass|business_card|id_card|screenshot|note|unknown",
        "documentConfidence": "float 0..1",
        "fields": [
            {
                "key": "ticket_number|name|date|price|merchant|email|phone|url|total|invoice_number|pnr|flight",
                "label": "string",
                "value": "string",
                "confidence": "float 0..1",
                "validated": "bool",
            }
        ],
        "analyzedAt": "ISO-8601",
    },
    "field_corrections": {
        "id": "string",
        "screenshotId": "string",
        "fieldKey": "string",
        "predictedValue": "string|null",
        "correctedValue": "string",
        "documentType": "string|null",
        "createdAt": "ISO-8601",
    },
}

if __name__ == "__main__":
    print(json.dumps(SCHEMA, indent=2))
