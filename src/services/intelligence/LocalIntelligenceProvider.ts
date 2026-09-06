import type { Category } from '../../constants/categories';
import {
  detectCategory,
  suggestIntent,
  suggestTags,
} from '../../categorization';
import type {
  ClassificationResult,
  EntityResult,
  IntelligenceProvider,
  ScreenshotInput,
} from './types';

/**
 * Rule-based local intelligence for MVP.
 */
export class LocalIntelligenceProvider implements IntelligenceProvider {
  async classifyScreenshot(
    input: ScreenshotInput,
  ): Promise<ClassificationResult> {
    const ocrText = input.ocrText ?? '';
    const category = detectCategory(ocrText);
    const intent = suggestIntent(ocrText);
    const suggestedTags = suggestTags(ocrText);

    return {
      category,
      intent,
      suggestedTags,
      confidence: ocrText.trim() ? 0.55 : 0,
    };
  }

  async summarizeScreenshot(input: ScreenshotInput): Promise<string> {
    const text = input.ocrText?.trim();
    if (!text) {
      return '';
    }
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }

  async extractEntities(input: ScreenshotInput): Promise<EntityResult> {
    const text = input.ocrText ?? '';
    const urls = text.match(/https?:\/\/[^\s]+/gi) ?? [];
    const amounts =
      text.match(/(?:₹|\$|€|£)\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:rs|inr)/gi) ??
      [];
    const dates =
      text.match(
        /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
      ) ?? [];

    return {
      urls: [...new Set(urls)].slice(0, 5),
      dates: [...new Set(dates)].slice(0, 5),
      amounts: [...new Set(amounts)].slice(0, 5),
    };
  }
}

export const localIntelligence = new LocalIntelligenceProvider();

export function categoryLabel(category: Category): string {
  return category;
}
