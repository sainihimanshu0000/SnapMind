export const INTENTS = [
  'buy',
  'learn',
  'idea',
  'reference',
  'visit',
  'remember',
  'compare',
  'follow_up',
  'other',
] as const;

export type Intent = (typeof INTENTS)[number];

export const INTENT_LABELS: Record<Intent, string> = {
  buy: 'Buy',
  learn: 'Learn',
  idea: 'Idea',
  reference: 'Reference',
  visit: 'Visit',
  remember: 'Reminder',
  compare: 'Compare',
  follow_up: 'Follow Up',
  other: 'Other',
};
