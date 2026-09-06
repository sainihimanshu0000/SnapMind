import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { screenshotDetector } from '../screenshotDetection';

export type OcrOutcome =
  | { ok: true; text: string }
  | { ok: false; message: string };

const FRIENDLY_FAIL =
  "We couldn't read text from this screenshot, but the image is still saved.";

function filePathFromUri(imageUri: string): string {
  let path = imageUri;
  if (path.startsWith('file://')) {
    path = decodeURI(path.replace('file://', ''));
  }
  if (path.startsWith('localhost')) {
    path = path.replace(/^localhost/, '');
  }
  return path;
}

/**
 * On-device OCR via the SnapMind Vision module. Never throws.
 */
export async function recognizeScreenshotText(
  imageUri: string,
): Promise<OcrOutcome> {
  if (!imageUri) {
    return { ok: false, message: FRIENDLY_FAIL };
  }

  const path = filePathFromUri(imageUri);

  try {
    const exists = await RNFS.exists(path);
    if (!exists) {
      return { ok: false, message: FRIENDLY_FAIL };
    }
  } catch {
    // Continue; native Vision may still open the URI.
  }

  const vision = await screenshotDetector.recognizeText(path);
  if (vision.ok && vision.text.trim()) {
    return { ok: true, text: vision.text.trim() };
  }

  const native = NativeModules.ScreenshotDetector as
    | { recognizeText?: (filePath: string) => Promise<{ ok?: boolean; text?: string }> }
    | undefined;
  if (!native?.recognizeText) {
    return {
      ok: false,
      message:
        'Text reading needs a native rebuild. Run npm run ios, then retry.',
    };
  }

  return {
    ok: false,
    message: vision.message || FRIENDLY_FAIL,
  };
}
