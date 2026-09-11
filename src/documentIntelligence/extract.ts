import type { ExtractedField, FieldKey } from './types';

function field(
  key: FieldKey,
  label: string,
  value: string | null | undefined,
  confidence: number,
  validated: boolean,
): ExtractedField | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return { key, label, value: trimmed, confidence, validated };
}

function normalizePrice(raw: string): { value: string; validated: boolean } {
  let text = raw.replace(/[,\s]/g, '');
  text = text.replace(/[Oo]/g, '0').replace(/[Ss]/g, '5').replace(/[Il]/g, '1');
  const match = text.match(/(?:₹|rs\.?|inr|\$|€|£)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!match) {
    return { value: raw.trim(), validated: false };
  }
  return { value: match[1], validated: true };
}

function normalizeDate(raw: string): { value: string; validated: boolean } {
  const cleaned = raw.trim();
  const iso = cleaned.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if (iso) {
    const value = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    return { value, validated: true };
  }
  const dmy = cleaned.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const value = `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    return { value, validated: true };
  }
  return { value: cleaned, validated: false };
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

export function extractTicketFields(ocrText: string): ExtractedField[] {
  const text = ocrText.replace(/\u00a0/g, ' ');
  const fields: ExtractedField[] = [];

  const ticketNumber = firstMatch(text, [
    /(?:ticket\s*(?:no|number|#)|booking\s*id|e-?ticket)\s*[:#-]?\s*([A-Z0-9\-]{5,})/i,
    /\b(TKT[A-Z0-9\-]{3,})\b/i,
  ]);
  if (ticketNumber) {
    fields.push(
      field('ticket_number', 'Ticket number', ticketNumber, 0.9, true)!,
    );
  }

  const name = firstMatch(text, [
    /(?:passenger|name|guest)\s*[:\-]?\s*([A-Za-z][A-Za-z .']{2,40})/i,
  ]);
  if (name) {
    fields.push(field('name', 'Name', name, 0.82, /^[A-Za-z .']+$/.test(name))!);
  }

  const dateRaw = firstMatch(text, [
    /(?:date|show(?:time)?|on)\s*[:\-]?\s*([0-9]{1,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
  ]);
  if (dateRaw) {
    const normalized = normalizeDate(dateRaw);
    fields.push(
      field(
        'date',
        'Date',
        normalized.value,
        normalized.validated ? 0.88 : 0.55,
        normalized.validated,
      )!,
    );
  }

  const priceRaw = firstMatch(text, [
    /(?:price|amount|total|fare)\s*[:\-]?\s*((?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?)/i,
    /((?:₹|\$)\s*[\d,]+(?:\.\d{1,2})?)/,
  ]);
  if (priceRaw) {
    const normalized = normalizePrice(priceRaw);
    fields.push(
      field(
        'price',
        'Price',
        normalized.value,
        normalized.validated ? 0.9 : 0.5,
        normalized.validated,
      )!,
    );
  }

  return fields;
}

export function extractReceiptFields(ocrText: string): ExtractedField[] {
  const text = ocrText.replace(/\u00a0/g, ' ');
  const fields: ExtractedField[] = [];
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const merchant = lines.find(
    line =>
      line.length > 2 &&
      line.length < 40 &&
      !/total|subtotal|gst|tax|receipt|invoice|cash|card/i.test(line) &&
      /[A-Za-z]/.test(line),
  );
  if (merchant) {
    fields.push(field('merchant', 'Merchant', merchant, 0.7, true)!);
  }

  const totalRaw = firstMatch(text, [
    /(?:grand\s*)?total\s*[:\-]?\s*((?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount\s*paid|net\s*amount)\s*[:\-]?\s*((?:₹|rs\.?|\$)?\s*[\d,]+(?:\.\d{1,2})?)/i,
  ]);
  if (totalRaw) {
    const normalized = normalizePrice(totalRaw);
    fields.push(
      field(
        'total',
        'Total',
        normalized.value,
        normalized.validated ? 0.92 : 0.55,
        normalized.validated,
      )!,
    );
  }

  const dateRaw = firstMatch(text, [
    /(?:date|dt)\s*[:\-]?\s*([0-9]{1,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
  ]);
  if (dateRaw) {
    const normalized = normalizeDate(dateRaw);
    fields.push(
      field(
        'date',
        'Date',
        normalized.value,
        normalized.validated ? 0.86 : 0.5,
        normalized.validated,
      )!,
    );
  }

  const invoice = firstMatch(text, [
    /(?:invoice|bill|receipt)\s*(?:no|number|#)?\s*[:#-]?\s*([A-Z0-9\-\/]{4,})/i,
  ]);
  if (invoice) {
    fields.push(field('invoice_number', 'Invoice / receipt #', invoice, 0.8, true)!);
  }

  return fields;
}

export function extractGenericFields(ocrText: string): ExtractedField[] {
  const text = ocrText;
  const fields: ExtractedField[] = [];

  const email = firstMatch(text, [/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i]);
  if (email) {
    fields.push(field('email', 'Email', email, 0.95, true)!);
  }

  const phoneMatch = text.match(
    /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/,
  );
  if (phoneMatch?.[0]) {
    fields.push(field('phone', 'Phone', phoneMatch[0], 0.75, true)!);
  }

  const url = firstMatch(text, [/(https?:\/\/[^\s]+)/i]);
  if (url) {
    fields.push(field('url', 'URL', url, 0.9, true)!);
  }

  return fields.filter(Boolean);
}
