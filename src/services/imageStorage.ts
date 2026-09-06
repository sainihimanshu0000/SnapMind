import RNFS from 'react-native-fs';
import { createId } from '../utils/id';
import { stripFileScheme, toDisplayUri } from '../utils/imageUri';

const SCREENSHOTS_DIR = `${RNFS.DocumentDirectoryPath}/screenshots`;

function extensionForImport(fileName?: string): string {
  const source = fileName ?? '';
  const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png' || ext === 'webp' || ext === 'gif' || ext === 'jpg' || ext === 'jpeg') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  // Picker compression writes JPEG data even when the original was HEIC.
  return 'jpg';
}

async function copiedSuccessfully(destination: string): Promise<boolean> {
  if (!(await RNFS.exists(destination))) {
    return false;
  }
  try {
    const stat = await RNFS.stat(destination);
    return Number(stat.size) > 32;
  } catch {
    return false;
  }
}

export async function ensureScreenshotsDir(): Promise<void> {
  const exists = await RNFS.exists(SCREENSHOTS_DIR);
  if (!exists) {
    await RNFS.mkdir(SCREENSHOTS_DIR);
  }
}

export async function saveImageLocally(
  sourceUri: string,
  fileName?: string,
  base64Data?: string,
): Promise<string> {
  await ensureScreenshotsDir();
  const ext = extensionForImport(fileName);
  const destination = `${SCREENSHOTS_DIR}/${createId()}.${ext}`;

  if (base64Data) {
    try {
      await RNFS.writeFile(destination, base64Data, 'base64');
      if (await copiedSuccessfully(destination)) {
        return toDisplayUri(destination);
      }
    } catch {
      // Fall through to file copy.
    }
  }

  if (!sourceUri) {
    throw new Error('Could not save image');
  }

  const fromPath = stripFileScheme(sourceUri);
  const attempts = [sourceUri, fromPath];
  for (const from of attempts) {
    try {
      await RNFS.copyFile(from, destination);
      if (await copiedSuccessfully(destination)) {
        return toDisplayUri(destination);
      }
    } catch {
      // Try the next path form.
    }
  }

  throw new Error('Could not save image');
}

export async function deleteLocalImage(imageUri: string): Promise<void> {
  try {
    const path = stripFileScheme(imageUri);
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  } catch {
    // Missing files should not crash deletion flows.
  }
}

export async function clearAllLocalImages(): Promise<void> {
  try {
    if (await RNFS.exists(SCREENSHOTS_DIR)) {
      await RNFS.unlink(SCREENSHOTS_DIR);
    }
  } catch {
    // Ignore cleanup failures.
  }
}

export function getScreenshotsDirectory(): string {
  return SCREENSHOTS_DIR;
}
