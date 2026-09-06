export const CATEGORIES = [
  'Shopping',
  'Learning',
  'Work',
  'Travel',
  'Food',
  'Ideas',
  'Entertainment',
  'Fashion',
  'Reference',
  'Important',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 'Other';
