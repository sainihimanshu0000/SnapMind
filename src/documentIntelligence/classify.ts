import type { DocumentType } from './types';

type ScoreRule = {
  type: DocumentType;
  keywords: string[];
  weight?: number;
};

const RULES: ScoreRule[] = [
  {
    type: 'boarding_pass',
    keywords: [
      'boarding pass',
      'boarding',
      'gate',
      'seat',
      'pnr',
      'flight',
      'departure',
      'arrival',
      'terminal',
    ],
    weight: 1.2,
  },
  {
    type: 'ticket',
    keywords: [
      'ticket',
      'ticket no',
      'ticket number',
      'booking id',
      'e-ticket',
      'eticket',
      'passenger',
      'admit one',
      'showtime',
      'cinema',
      'movie',
      'concert',
    ],
  },
  {
    type: 'receipt',
    keywords: [
      'receipt',
      'tax invoice',
      'subtotal',
      'total',
      'cash',
      'card payment',
      'gst',
      'cgst',
      'sgst',
      'thank you for shopping',
      'change due',
      'items',
    ],
  },
  {
    type: 'invoice',
    keywords: [
      'invoice',
      'bill to',
      'invoice no',
      'invoice number',
      'due date',
      'amount due',
      'vendor',
    ],
  },
  {
    type: 'business_card',
    keywords: [
      'linkedin',
      'ceo',
      'founder',
      'mobile',
      'designation',
      'visit us',
    ],
  },
  {
    type: 'id_card',
    keywords: [
      'aadhaar',
      'aadhar',
      'pan card',
      'passport',
      'driving licence',
      'driving license',
      'date of birth',
      'dob',
      'government of india',
    ],
  },
  {
    type: 'note',
    keywords: ['todo', 'notes', 'reminder', 'checklist'],
  },
];

export function classifyDocument(ocrText: string): {
  documentType: DocumentType;
  confidence: number;
} {
  const text = ocrText.toLowerCase();
  if (!text.trim()) {
    return { documentType: 'unknown', confidence: 0 };
  }

  let best: DocumentType = 'screenshot';
  let bestScore = 0;
  let second = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        score += rule.weight ?? 1;
      }
    }
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      best = rule.type;
    } else if (score > second) {
      second = score;
    }
  }

  if (bestScore === 0) {
    return { documentType: 'screenshot', confidence: 0.35 };
  }

  const confidence = Math.min(
    0.98,
    0.45 + bestScore * 0.12 + (bestScore - second) * 0.05,
  );
  return { documentType: best, confidence };
}
