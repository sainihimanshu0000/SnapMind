import type { Category } from '../../constants/categories';
import type { Intent } from '../../constants/intents';

export type ScreenshotInput = {
  imageUri: string;
  ocrText?: string | null;
};

export type ClassificationResult = {
  category: Category;
  intent: Intent | null;
  suggestedTags: string[];
  confidence: number;
};

export type EntityResult = {
  urls: string[];
  dates: string[];
  amounts: string[];
};

/**
 * Abstraction for future AI providers.
 * MVP uses LocalIntelligenceProvider (rule-based).
 */
export interface IntelligenceProvider {
  classifyScreenshot(input: ScreenshotInput): Promise<ClassificationResult>;
  summarizeScreenshot(input: ScreenshotInput): Promise<string>;
  extractEntities(input: ScreenshotInput): Promise<EntityResult>;
}
