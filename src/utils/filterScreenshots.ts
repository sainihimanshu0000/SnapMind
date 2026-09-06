import type { HomeFilter, ScreenshotWithMeta } from '../types';

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function filterScreenshots(
  screenshots: ScreenshotWithMeta[],
  filter: HomeFilter,
  query: string,
): ScreenshotWithMeta[] {
  const q = query.trim().toLowerCase();
  const recentCutoff = Date.now() - RECENT_MS;

  return screenshots.filter(shot => {
    if (filter === 'Favorites' && !shot.isFavorite) {
      return false;
    }
    if (filter === 'Recent') {
      const created = new Date(shot.createdAt).getTime();
      if (Number.isNaN(created) || created < recentCutoff) {
        return false;
      }
    }
    if (!q) {
      return true;
    }
    const haystack = [
      shot.ocrText,
      shot.notes,
      shot.category,
      shot.intent,
      shot.collectionName,
      ...shot.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
