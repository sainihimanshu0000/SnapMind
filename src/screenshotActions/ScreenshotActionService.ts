import RNFS from 'react-native-fs';
import { detectCategory, suggestIntent, suggestTags } from '../categorization';
import { screenshotDetector } from '../screenshotDetection';
import type { ScreenshotAsset } from '../screenshotDetection';
import { ensureScreenshotsDir } from '../services/imageStorage';
import { localIntelligence } from '../services/intelligence';
import {
  createScreenshot,
  getScreenshotBySourceAssetId,
  setScreenshotTags,
  updateScreenshot,
} from '../services/screenshotsRepository';
import {
  getProcessedAsset,
  markAssetProcessed,
} from './processedAssets';
import type { ScreenshotWithMeta } from '../types';
import { toDisplayUri } from '../utils/imageUri';
import { createId } from '../utils/id';

export type ActionResult = {
  ok: boolean;
  message: string;
  screenshot?: ScreenshotWithMeta;
  alreadySaved?: boolean;
  cancelled?: boolean;
};

async function classifyAndStore(shot: ScreenshotWithMeta): Promise<ScreenshotWithMeta> {
  const ocr = await screenshotDetector.recognizeText(shot.imageUri);
  const text = ocr.ok ? ocr.text : shot.ocrText ?? '';
    const classification = await localIntelligence.classifyScreenshot({
    imageUri: shot.imageUri,
    ocrText: text,
  });
  const updated = await updateScreenshot(shot.id, {
    ocrText: text || shot.ocrText,
    category: classification.category,
    intent: classification.intent,
    processingStatus: 'processed',
  });
  if (classification.suggestedTags.length) {
    await setScreenshotTags(shot.id, classification.suggestedTags);
  }
  return updated ?? shot;
}

export async function isAlreadyInSnapMind(assetId: string): Promise<boolean> {
  const existing = await getScreenshotBySourceAssetId(assetId);
  if (existing) {
    return true;
  }
  const processed = await getProcessedAsset(assetId);
  return processed?.status === 'saved' || processed?.status === 'organized';
}

export async function saveDetectedScreenshot(
  asset: ScreenshotAsset,
  options?: { favorite?: boolean },
): Promise<ActionResult> {
  try {
    const existing = await getScreenshotBySourceAssetId(asset.id);
    if (existing) {
      await markAssetProcessed({
        photoAssetId: asset.id,
        status: 'saved',
        screenshotId: existing.id,
      });
      return {
        ok: true,
        alreadySaved: true,
        message: 'Already in SnapMind',
        screenshot: existing,
      };
    }

    await ensureScreenshotsDir();
    const dest = `${RNFS.DocumentDirectoryPath}/screenshots/${createId()}.jpg`;
    const copied = await screenshotDetector.copyAsset(asset.id, dest);
    const localUri = toDisplayUri(copied);
    const created = await createScreenshot({
      imageUri: toDisplayUri(localUri),
      sourceAssetId: asset.id,
      isFavorite: options?.favorite,
      processingStatus: 'processing',
    });
    await markAssetProcessed({
      photoAssetId: asset.id,
      status: 'saved',
      screenshotId: created.id,
    });

    classifyAndStore(created).catch(() => undefined);

    return {
      ok: true,
      message: 'Saved to SnapMind',
      screenshot: created,
    };
  } catch {
    return {
      ok: false,
      message: "We couldn't process this screenshot, but nothing was deleted.",
    };
  }
}

export async function deleteDetectedScreenshot(
  asset: ScreenshotAsset,
): Promise<ActionResult> {
  try {
    const result = await screenshotDetector.deleteAsset(asset.id);
    if (result.ok) {
      await markAssetProcessed({
        photoAssetId: asset.id,
        status: 'deleted',
      });
      return { ok: true, message: 'Deleted from Photos' };
    }
    if (result.cancelled) {
      return {
        ok: false,
        cancelled: true,
        message: 'Deletion cancelled. The screenshot is still in Photos.',
      };
    }
    return {
      ok: false,
      message:
        result.message ??
        'Photos did not allow deletion. Open the Photos app to delete it yourself. Nothing in SnapMind was changed.',
    };
  } catch {
    return {
      ok: false,
      message: "We couldn't delete this screenshot, but nothing was removed.",
    };
  }
}

export async function dismissDetectedScreenshot(
  asset: ScreenshotAsset,
): Promise<void> {
  await markAssetProcessed({
    photoAssetId: asset.id,
    status: 'dismissed',
  });
}

export async function extractTextFromAsset(asset: ScreenshotAsset): Promise<{
  ok: boolean;
  text: string;
  message: string;
  screenshot?: ScreenshotWithMeta;
}> {
  const saved = await saveDetectedScreenshot(asset);
  if (!saved.ok || !saved.screenshot) {
    return {
      ok: false,
      text: '',
      message: saved.message,
    };
  }

  const ocr = await screenshotDetector.recognizeText(saved.screenshot.imageUri);
  if (ocr.ok && ocr.text) {
    await updateScreenshot(saved.screenshot.id, {
      ocrText: ocr.text,
      category: detectCategory(ocr.text),
      intent: suggestIntent(ocr.text),
      processingStatus: 'processed',
    });
    const tags = suggestTags(ocr.text);
    if (tags.length) {
      await setScreenshotTags(saved.screenshot.id, tags);
    }
    return {
      ok: true,
      text: ocr.text,
      message: 'Text detected',
      screenshot: saved.screenshot,
    };
  }

  return {
    ok: false,
    text: '',
    message:
      ocr.message ??
      "We couldn't read text from this screenshot, but the image is saved.",
    screenshot: saved.screenshot,
  };
}

export { classifyAndStore };
