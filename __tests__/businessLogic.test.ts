import {
  detectCategory,
  suggestIntent,
  suggestTags,
} from '../src/categorization';
import { parseSearchQuery } from '../src/services/search';

jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    execute: jest.fn(async () => ({ rows: [] })),
    close: jest.fn(),
  }),
}));

describe('categorization engine', () => {
  it('detects shopping from ecommerce text', () => {
    expect(
      detectCategory('Amazon cart total ₹2499 wishlist buy now'),
    ).toBe('Shopping');
  });

  it('detects learning from programming text', () => {
    expect(
      detectCategory('React Native TypeScript tutorial documentation'),
    ).toBe('Learning');
  });

  it('suggests buy intent from price cues', () => {
    expect(suggestIntent('Add to cart price $49')).toBe('buy');
  });

  it('suggests tags from OCR keywords', () => {
    expect(suggestTags('Goa trip and React learning')).toEqual(
      expect.arrayContaining(['goa', 'react']),
    );
  });
});

describe('search parser', () => {
  it('parses favorites and category', () => {
    expect(parseSearchQuery('favorite shopping')).toEqual({
      favoritesOnly: true,
      category: 'Shopping',
    });
  });

  it('parses intent and free text', () => {
    expect(parseSearchQuery('buy react')).toEqual({
      intent: 'buy',
      text: 'react',
    });
  });

  it('parses this week', () => {
    const result = parseSearchQuery('this week');
    expect(result.createdAfter).toBeTruthy();
  });
});

describe('recent filter helper', () => {
  const { filterScreenshots } = require('../src/utils/filterScreenshots');

  const base = {
    id: '1',
    imageUri: 'file://x',
    updatedAt: new Date().toISOString(),
    ocrText: null,
    category: 'Other',
    intent: null,
    notes: null,
    sourceUrl: null,
    isFavorite: false,
    isTemporary: false,
    reminderDate: null,
    collectionId: null,
    sourceAssetId: null,
    processingStatus: 'processed',
    tags: [],
    collectionName: null,
  };

  it('keeps only last-7-day screenshots for Recent', () => {
    const recent = {
      ...base,
      id: 'recent',
      createdAt: new Date().toISOString(),
    };
    const old = {
      ...base,
      id: 'old',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const result = filterScreenshots([recent, old], 'Recent', '');
    expect(result.map((s: { id: string }) => s.id)).toEqual(['recent']);
  });
});

describe('screenshot quick actions helpers', () => {
  const {
    suggestedActionsForCategory,
  } = require('../src/screenshotDetection/screenshotTypes');
  const { filterUnprocessed } = require('../src/screenshotActions/processedAssets');

  it('suggests shopping actions from local category rules', () => {
    expect(suggestedActionsForCategory('Shopping').title).toMatch(/Shopping/);
    expect(suggestedActionsForCategory('Travel').extras.map((item: { id: string }) => item.id)).toContain(
      'organize',
    );
    expect(suggestedActionsForCategory('Learning').extras.map((item: { id: string }) => item.id)).toContain(
      'save',
    );
  });

  it('filters already processed screenshot assets', () => {
    const assets = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(filterUnprocessed(assets, new Set(['b']))).toEqual([{ id: 'a' }, { id: 'c' }]);
  });
});
