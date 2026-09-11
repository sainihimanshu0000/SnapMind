export type DocumentType =
  | 'ticket'
  | 'receipt'
  | 'invoice'
  | 'boarding_pass'
  | 'business_card'
  | 'id_card'
  | 'screenshot'
  | 'note'
  | 'unknown';

export type FieldKey =
  | 'ticket_number'
  | 'name'
  | 'date'
  | 'price'
  | 'merchant'
  | 'email'
  | 'phone'
  | 'url'
  | 'total'
  | 'invoice_number'
  | 'pnr'
  | 'flight';

export type ExtractedField = {
  key: FieldKey;
  label: string;
  value: string;
  confidence: number;
  validated: boolean;
};

export type DocumentAnalysis = {
  documentType: DocumentType;
  documentConfidence: number;
  fields: ExtractedField[];
  analyzedAt: string;
};
