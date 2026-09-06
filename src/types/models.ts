import type { Category } from '../constants/categories';
import type { Intent } from '../constants/intents';

export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'dismissed';

export type ProcessedAssetStatus =
  | 'new'
  | 'saved'
  | 'deleted'
  | 'dismissed'
  | 'reminded'
  | 'organized';

export type Screenshot = {
  id: string;
  imageUri: string;
  createdAt: string;
  updatedAt: string;
  ocrText: string | null;
  category: Category;
  intent: Intent | null;
  notes: string | null;
  sourceUrl: string | null;
  isFavorite: boolean;
  isTemporary: boolean;
  reminderDate: string | null;
  collectionId: string | null;
  sourceAssetId: string | null;
  processingStatus: ProcessingStatus;
};

export type ScreenshotWithMeta = Screenshot & {
  tags: string[];
  collectionName: string | null;
};

export type Tag = {
  id: string;
  name: string;
};

export type Collection = {
  id: string;
  name: string;
  createdAt: string;
  screenshotCount?: number;
};

export type Reminder = {
  id: string;
  screenshotId: string;
  reminderDate: string;
  title: string;
  completed: boolean;
};

export type HomeFilter = 'All' | 'Recent' | 'Favorites';

export type SearchFilters = {
  text?: string;
  category?: Category;
  intent?: Intent;
  favoritesOnly?: boolean;
  createdAfter?: string;
};
