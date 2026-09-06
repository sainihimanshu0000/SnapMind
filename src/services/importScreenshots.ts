import { NativeModules, Platform } from 'react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { recognizeScreenshotText } from '../ocr';
import { localIntelligence } from './intelligence';
import { saveImageLocally } from './imageStorage';
import {
  createScreenshot,
  getScreenshotById,
  setScreenshotTags,
  updateScreenshot,
} from './screenshotsRepository';
import type { ScreenshotWithMeta } from '../types';

export type ImportProgress = {
  total: number;
  completed: number;
  currentLabel: string;
};

export type ImportResult = {
  imported: ScreenshotWithMeta[];
  failedCount: number;
  ocrQueued: boolean;
  cancelled: boolean;
};

const ocrQueue: string[] = [];
let ocrWorkerRunning = false;

const PICKER_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  // Unlimited selection loads every photo into memory and can kill the app.
  selectionLimit: 10,
  includeBase64: true,
  includeExtra: false,
  // Modest downscale in the picker so huge screenshots don't OOM.
  quality: 0.8,
  maxWidth: 1280,
  maxHeight: 1280,
  // fullScreen presentation crashes with React Navigation on some iOS builds.
  presentationStyle: 'pageSheet',
  assetRepresentationMode: 'compatible',
};

function pickerUnavailableMessage(error: unknown): { title: string; body: string } {
  const message = String(error);
  const missingNative =
    message.includes('launchImageLibrary') ||
    message.includes('null') ||
    message.includes('undefined') ||
    NativeModules.ImagePicker == null;

  if (missingNative) {
    return {
      title: 'Rebuild required',
      body: 'Photo picker native code is missing from this app build.\n\nQuit the app, then run:\n\nnpm run ios',
    };
  }

  return {
    title: 'Import unavailable',
    body:
      Platform.select({
        ios: 'Could not open the photo library. Check Photos permission in Settings.',
        android:
          'Could not open the photo library. Allow Photos permission and try again.',
        default: 'Could not open the photo library.',
      }) ?? 'Could not open the photo library.',
  };
}

/**
 * Opens the system photo picker immediately.
 * Do not show a React Native modal before this — it blocks PHPicker on iOS.
 */
export async function pickImagesFromGallery(): Promise<{
  assets: Asset[];
  error?: { title: string; body: string };
}> {
  let response: ImagePickerResponse;

  try {
    response = await launchImageLibrary(PICKER_OPTIONS);
  } catch (error) {
    return { assets: [], error: pickerUnavailableMessage(error) };
  }

  if (response.didCancel) {
    return { assets: [] };
  }

  if (response.errorCode) {
    const message =
      response.errorCode === 'permission'
        ? Platform.select({
            ios: 'Photo access is required to import screenshots. Enable it in Settings.',
            android:
              'Photo access is required to import screenshots. Allow photos permission and try again.',
            default: 'Photo access is required to import screenshots.',
          })
        : response.errorMessage ?? 'Could not open your photo library.';

    return {
      assets: [],
      error: { title: 'Import unavailable', body: message ?? 'Could not open your photo library.' },
    };
  }

  return {
    assets: (response.assets ?? []).filter(
      asset => Boolean(asset.uri) || Boolean(asset.base64),
    ),
  };
}

async function saveAssetFast(asset: Asset): Promise<ScreenshotWithMeta> {
  if (!asset.uri && !asset.base64) {
    throw new Error('Selected image has no URI');
  }

  const localUri = await saveImageLocally(
    asset.uri ?? '',
    asset.fileName,
    asset.base64,
  );
  return createScreenshot({ imageUri: localUri });
}

async function runOcrAndClassify(screenshotId: string): Promise<void> {
  const shot = await getScreenshotById(screenshotId);
  if (!shot) {
    return;
  }

  const ocr = await recognizeScreenshotText(shot.imageUri);
  if (!ocr.ok) {
    return;
  }

  const classification = await localIntelligence.classifyScreenshot({
    imageUri: shot.imageUri,
    ocrText: ocr.text,
  });

  await updateScreenshot(shot.id, {
    ocrText: ocr.text,
    category:
      shot.category === 'Other' ? classification.category : shot.category,
    intent: shot.intent ?? classification.intent,
  });

  if (classification.suggestedTags.length) {
    const merged = [...new Set([...shot.tags, ...classification.suggestedTags])];
    await setScreenshotTags(shot.id, merged);
  }
}

async function drainOcrQueue(onItemDone?: () => void): Promise<void> {
  if (ocrWorkerRunning) {
    return;
  }
  ocrWorkerRunning = true;
  try {
    while (ocrQueue.length) {
      const id = ocrQueue.shift();
      if (!id) {
        continue;
      }
      try {
        await runOcrAndClassify(id);
      } catch {
        // Keep processing the rest.
      }
      onItemDone?.();
    }
  } finally {
    ocrWorkerRunning = false;
  }
}

function queueOcr(screenshotIds: string[], onItemDone?: () => void): void {
  ocrQueue.push(...screenshotIds);
  // Let the picker dismiss and the grid render before touching Vision/ML Kit.
  setTimeout(() => {
    drainOcrQueue(onItemDone).catch(() => undefined);
  }, 1500);
}

export async function savePickedScreenshots(
  assets: Asset[],
  options?: {
    onProgress?: (progress: ImportProgress) => void;
    onOcrItemDone?: () => void;
  },
): Promise<ImportResult> {
  if (!assets.length) {
    return { imported: [], failedCount: 0, ocrQueued: false, cancelled: true };
  }

  const imported: ScreenshotWithMeta[] = [];
  let failedCount = 0;

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    options?.onProgress?.({
      total: assets.length,
      completed: index,
      currentLabel: `Saving ${index + 1} of ${assets.length}…`,
    });

    try {
      const shot = await saveAssetFast(asset);
      imported.push(shot);
    } catch {
      failedCount += 1;
    }
  }

  options?.onProgress?.({
    total: assets.length,
    completed: assets.length,
    currentLabel: 'Done',
  });

  if (imported.length) {
    queueOcr(
      imported.map(shot => shot.id),
      options?.onOcrItemDone,
    );
  }

  return {
    imported,
    failedCount,
    ocrQueued: imported.length > 0,
    cancelled: false,
  };
}

export async function retryOcrForScreenshot(
  screenshot: ScreenshotWithMeta,
): Promise<{ screenshot: ScreenshotWithMeta; ok: boolean; message: string }> {
  try {
    const ocr = await recognizeScreenshotText(screenshot.imageUri);
    if (!ocr.ok) {
      return { screenshot, ok: false, message: ocr.message };
    }

    const classification = await localIntelligence.classifyScreenshot({
      imageUri: screenshot.imageUri,
      ocrText: ocr.text,
    });

    const updated = await updateScreenshot(screenshot.id, {
      ocrText: ocr.text,
      category:
        screenshot.category === 'Other'
          ? classification.category
          : screenshot.category,
      intent: screenshot.intent ?? classification.intent,
    });

    if (classification.suggestedTags.length) {
      await setScreenshotTags(screenshot.id, [
        ...new Set([...screenshot.tags, ...classification.suggestedTags]),
      ]);
    }

    const next = (await getScreenshotById(screenshot.id)) ?? updated ?? screenshot;
    return { screenshot: next, ok: true, message: 'Text saved from this screenshot.' };
  } catch {
    return {
      screenshot,
      ok: false,
      message: 'Could not read text. The screenshot is still saved.',
    };
  }
}
