import type { Category } from '../constants/categories';
import { CATEGORIES, DEFAULT_CATEGORY } from '../constants/categories';
import type { Intent } from '../constants/intents';
import { INTENTS } from '../constants/intents';

type Rule = {
  category: Category;
  keywords: string[];
  weight?: number;
};

const CATEGORY_RULES: Rule[] = [
  {
    category: 'Shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'cart',
      'wishlist',
      'price',
      '₹',
      '$',
      'buy now',
      'add to bag',
      'checkout',
      'order',
    ],
  },
  {
    category: 'Learning',
    keywords: [
      'react',
      'javascript',
      'python',
      'tutorial',
      'course',
      'lecture',
      'documentation',
      'stackoverflow',
      'github',
      'learn',
      'typescript',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'flight',
      'hotel',
      'booking',
      'delhi',
      'mumbai',
      'goa',
      'airport',
      'airbnb',
      'itinerary',
      'train',
    ],
  },
  {
    category: 'Food',
    keywords: [
      'recipe',
      'restaurant',
      'menu',
      'zomato',
      'swiggy',
      'delivery',
      'calories',
      'ingredients',
    ],
  },
  {
    category: 'Work',
    keywords: [
      'meeting',
      'slack',
      'jira',
      'deadline',
      'invoice',
      'standup',
      'sprint',
      'figma',
      'notion',
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix',
      'spotify',
      'youtube',
      'trailer',
      'episode',
      'playlist',
      'movie',
    ],
  },
  {
    category: 'Fashion',
    keywords: [
      'outfit',
      'silhouette',
      'streetwear',
      'dress',
      'sneakers',
      'lookbook',
    ],
  },
  {
    category: 'Ideas',
    keywords: ['idea', 'inspiration', 'moodboard', 'concept', 'brainstorm'],
  },
  {
    category: 'Reference',
    keywords: ['reference', 'save this', 'cheatsheet', 'snippet'],
  },
  {
    category: 'Important',
    keywords: ['otp', 'password', 'urgent', 'important', 'expires'],
  },
];

const INTENT_RULES: Array<{ intent: Intent; keywords: string[] }> = [
  { intent: 'buy', keywords: ['buy', 'cart', 'wishlist', 'price', '₹', '$', 'order'] },
  { intent: 'learn', keywords: ['tutorial', 'course', 'learn', 'documentation', 'lecture'] },
  { intent: 'visit', keywords: ['hotel', 'flight', 'booking', 'maps', 'directions', 'goa'] },
  { intent: 'follow_up', keywords: ['follow up', 'remind', 'todo', 'deadline'] },
  { intent: 'compare', keywords: ['vs', 'compare', 'alternative', 'better'] },
  { intent: 'idea', keywords: ['idea', 'inspiration', 'moodboard'] },
  { intent: 'reference', keywords: ['reference', 'cheatsheet', 'snippet'] },
  { intent: 'remember', keywords: ['remember', 'note this', 'save this'] },
];

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    return lower.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

export function detectCategory(ocrText: string | null | undefined): Category {
  if (!ocrText?.trim()) {
    return DEFAULT_CATEGORY;
  }

  let best: Category = DEFAULT_CATEGORY;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    const score = scoreText(ocrText, rule.keywords) * (rule.weight ?? 1);
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  return bestScore > 0 ? best : DEFAULT_CATEGORY;
}

export function suggestIntent(ocrText: string | null | undefined): Intent | null {
  if (!ocrText?.trim()) {
    return null;
  }

  let best: Intent | null = null;
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    const score = scoreText(ocrText, rule.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = rule.intent;
    }
  }

  return bestScore > 0 ? best : null;
}

export function suggestTags(ocrText: string | null | undefined): string[] {
  if (!ocrText?.trim()) {
    return [];
  }

  const lower = ocrText.toLowerCase();
  const candidates = [
    'react',
    'shopping',
    'goa',
    'work',
    'travel',
    'food',
    'fashion',
    'learning',
    'design',
    'wishlist',
  ];

  return candidates.filter(tag => lower.includes(tag)).slice(0, 5);
}

export function isValidCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isValidIntent(value: string): value is Intent {
  return (INTENTS as readonly string[]).includes(value);
}
