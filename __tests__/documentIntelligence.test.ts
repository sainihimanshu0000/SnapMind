import {
  analyzeDocument,
  classifyDocument,
  extractReceiptFields,
  extractTicketFields,
} from '../src/documentIntelligence';

describe('document classification', () => {
  it('classifies ticket text', () => {
    const result = classifyDocument(
      'E-Ticket Booking ID ABC123 Passenger Rahul Showtime Cinema',
    );
    expect(result.documentType).toBe('ticket');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies receipt text', () => {
    const result = classifyDocument(
      'Tax Invoice Subtotal Total GST Thank you for shopping Cash',
    );
    expect(result.documentType).toBe('receipt');
  });

  it('returns screenshot for generic OCR', () => {
    const result = classifyDocument('Hello world from a chat app');
    expect(result.documentType).toBe('screenshot');
  });
});

describe('field extraction', () => {
  it('extracts ticket fields', () => {
    const fields = extractTicketFields(
      'Ticket Number: TKT99881\nPassenger: Ada Lovelace\nDate: 12/03/2026\nTotal Fare: ₹450',
    );
    const byKey = Object.fromEntries(fields.map(field => [field.key, field]));
    expect(byKey.ticket_number?.value).toBe('TKT99881');
    expect(byKey.name?.value).toMatch(/Ada/);
    expect(byKey.date?.value).toBe('2026-03-12');
    expect(byKey.price?.value).toBe('450');
  });

  it('extracts receipt total and merchant', () => {
    const fields = extractReceiptFields(
      'Blue Bottle Coffee\nInvoice No INV-44\nDate: 01/09/2026\nGrand Total: $18.50',
    );
    const byKey = Object.fromEntries(fields.map(field => [field.key, field]));
    expect(byKey.merchant?.value).toMatch(/Blue Bottle/i);
    expect(byKey.total?.value).toBe('18.50');
    expect(byKey.invoice_number?.value).toMatch(/INV-44/i);
  });
});

describe('analyzeDocument', () => {
  it('returns typed analysis with confidence', () => {
    const analysis = analyzeDocument(
      'Receipt Subtotal Total GST\nCafe Local\nTotal: Rs 220\ncontact@cafe.example',
    );
    expect(analysis.documentType).toBe('receipt');
    expect(analysis.documentConfidence).toBeGreaterThan(0.4);
    expect(analysis.fields.some(field => field.key === 'email')).toBe(true);
    expect(analysis.fields.some(field => field.key === 'total')).toBe(true);
  });
});
