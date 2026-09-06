import { NativeModules, Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { exportAllData } from './screenshotsRepository';

function fileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function nativePath(path: string): string {
  return path.replace(/^file:\/\//, '');
}

export async function writeLibraryExportFile(): Promise<{
  path: string;
  fileName: string;
}> {
  const json = await exportAllData();
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `snapmind-export-${stamp}.json`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }
  await RNFS.writeFile(path, json, 'utf8');
  return { path, fileName };
}

export async function shareLibraryExport(): Promise<void> {
  const { path, fileName } = await writeLibraryExportFile();
  const native = NativeModules.ScreenshotDetector as
    | { shareFile?: (path: string, mimeType: string, title: string) => Promise<unknown> }
    | undefined;

  if (native?.shareFile) {
    await native.shareFile(nativePath(path), 'application/json', fileName);
    return;
  }

  // iOS can share a file URL without native code. Android text share cannot
  // carry a full library dump (Intent extras are capped around 1MB).
  if (Platform.OS === 'ios') {
    await Share.share({ url: fileUri(path), title: fileName });
    return;
  }

  throw new Error(
    'Could not open the file share sheet. Rebuild the Android app, then try Export data again.',
  );
}