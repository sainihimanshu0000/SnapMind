import type { Category } from '../../constants/categories';
import type { Intent } from '../../constants/intents';
import { isValidCategory, isValidIntent } from '../../categorization';
import type { SearchFilters } from '../../types';

/**
 * Lightweight natural-language search parser.
 * Converts common phrases into local DB filters.
 * Designed so semantic search can plug in later.
 */
export function parseSearchQuery(rawQuery: string): SearchFilters {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return {};
  }

  const filters: SearchFilters = {};
  let remaining = query;

  if (/\bfavorites?\b|\bstarred\b/.test(remaining)) {
    filters.favoritesOnly = true;
    remaining = remaining.replace(/\bfavorites?\b|\bstarred\b/g, ' ').trim();
  }

  if (/\bthis week\b/.test(remaining)) {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    filters.createdAfter = start.toISOString();
    remaining = remaining.replace(/\bthis week\b/g, ' ').trim();
  }

  const categoryMatch = remaining.match(
    /\b(shopping|learning|work|travel|food|ideas|entertainment|fashion|reference|important|other)\b/,
  );
  if (categoryMatch && isValidCategory(capitalize(categoryMatch[1]))) {
    filters.category = capitalize(categoryMatch[1]) as Category;
    remaining = remaining.replace(categoryMatch[0], ' ').trim();
  }

  const intentMatch = remaining.match(
    /\b(buy|learn|idea|reference|visit|remember|compare|follow[_\s]?up|other)\b/,
  );
  if (intentMatch) {
    const normalized = intentMatch[1].replace(/\s+/g, '_') as Intent;
    if (isValidIntent(normalized)) {
      filters.intent = normalized;
      remaining = remaining.replace(intentMatch[0], ' ').trim();
    }
  }

  // "under 5000" — keep as text search for OCR amounts for now
  remaining = remaining.replace(/\s+/g, ' ').trim();
  if (remaining) {
    filters.text = remaining;
  }

  return filters;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
