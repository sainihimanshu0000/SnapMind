import { classifyDocument } from './classify';
import {
  extractGenericFields,
  extractReceiptFields,
  extractTicketFields,
} from './extract';
import type { DocumentAnalysis, ExtractedField } from './types';

function mergeFields(groups: ExtractedField[][]): ExtractedField[] {
  const byKey = new Map<string, ExtractedField>();
  for (const group of groups) {
    for (const item of group) {
      const existing = byKey.get(item.key);
      if (!existing || item.confidence > existing.confidence) {
        byKey.set(item.key, item);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * V1 document intelligence: classify + rule/OCR field extraction + validation flags.
 */
export function analyzeDocument(ocrText: string | null | undefined): DocumentAnalysis {
  const text = ocrText?.trim() ?? '';
  const { documentType, confidence } = classifyDocument(text);

  let typedFields: ExtractedField[] = [];
  if (documentType === 'ticket' || documentType === 'boarding_pass') {
    typedFields = extractTicketFields(text);
  } else if (documentType === 'receipt' || documentType === 'invoice') {
    typedFields = extractReceiptFields(text);
  }

  const fields = mergeFields([typedFields, extractGenericFields(text)]);

  return {
    documentType,
    documentConfidence: confidence,
    fields,
    analyzedAt: new Date().toISOString(),
  };
}

export function serializeAnalysis(analysis: DocumentAnalysis): string {
  return JSON.stringify(analysis);
}

export function parseAnalysis(raw: string | null | undefined): DocumentAnalysis | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as DocumentAnalysis;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.fields)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
