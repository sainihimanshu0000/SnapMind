import {
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import {
  UNSUPPORTED_CAPABILITIES,
  type DetectorInterface,
  type PhotoPermissionStatus,
  type ScreenshotAsset,
  type ScreenshotDetectorCapabilities,
} from './screenshotTypes';

type NativeDetector = {
  getCapabilities: () => Promise<ScreenshotDetectorCapabilities>;
  getPermissionStatus: () => Promise<{ status: PhotoPermissionStatus }>;
  requestPermission: () => Promise<{ status: PhotoPermissionStatus }>;
  startWatching: () => Promise<{ ok: boolean }>;
  stopWatching: () => Promise<{ ok: boolean }>;
  scanAndNotify?: () => Promise<{ ok: boolean }>;
  setLastScanMs?: (ms: number) => Promise<{ ok: boolean }>;
  getNewScreenshots: (
    sinceMs: number,
    limit: number,
  ) => Promise<ScreenshotAsset[]>;
  copyAsset: (
    assetId: string,
    toPath: string,
  ) => Promise<{ uri?: string; path?: string }>;
  shareFile?: (
    path: string,
    mimeType: string,
    title: string,
  ) => Promise<{ ok?: boolean }>;
  deleteAsset: (assetId: string) => Promise<{
    ok: boolean;
    cancelled?: boolean;
    message?: string;
  }>;
  recognizeText: (
    filePath: string,
  ) => Promise<{ ok: boolean; text?: string; message?: string }>;
  setClipboard: (text: string) => Promise<{ ok: boolean }>;
};

function nativeModule(): NativeDetector | null {
  const module = NativeModules.ScreenshotDetector as NativeDetector | undefined;
  return module?.getCapabilities ? module : null;
}

async function requestAndroidPermission(): Promise<PhotoPermissionStatus> {
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  if (!permission) {
    return 'denied';
  }

  const current = await PermissionsAndroid.check(permission);
  if (current) {
    return 'authorized';
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Photo access',
    message:
      'SnapMind needs access to your photos to organize screenshots you choose to save.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED
    ? 'authorized'
    : 'denied';
}

const detector: DetectorInterface = {
  async isSupported() {
    const caps = await this.getCapabilities();
    return caps.supported;
  },

  async getCapabilities() {
    const native = nativeModule();
    if (!native) {
      return {
        ...UNSUPPORTED_CAPABILITIES,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
        summary:
          Platform.OS === 'ios' || Platform.OS === 'android'
            ? 'Screenshot detection native module is missing. Rebuild the app after installing this feature.'
            : UNSUPPORTED_CAPABILITIES.summary,
      };
    }
    try {
      return await native.getCapabilities();
    } catch {
      return UNSUPPORTED_CAPABILITIES;
    }
  },

  async getPermissionStatus() {
    const native = nativeModule();
    if (!native) {
      return 'unavailable';
    }
    try {
      const result = await native.getPermissionStatus();
      return result.status;
    } catch {
      return 'unavailable';
    }
  },

  async requestPermission() {
    if (Platform.OS === 'android') {
      return requestAndroidPermission();
    }
    const native = nativeModule();
    if (!native) {
      return 'unavailable';
    }
    try {
      const result = await native.requestPermission();
      return result.status;
    } catch {
      return 'denied';
    }
  },

  async start() {
    const native = nativeModule();
    if (!native) {
      return;
    }
    try {
      await native.startWatching();
    } catch {
      // Watching is best-effort while the app is active.
    }
  },

  async stop() {
    const native = nativeModule();
    if (!native) {
      return;
    }
    try {
      await native.stopWatching();
    } catch {
      // Ignore.
    }
  },

  async scanAndNotify() {
    const native = nativeModule();
    try {
      await native?.scanAndNotify?.();
    } catch {
      // Native notify is best-effort.
    }
  },

  async setLastScanMs(ms: number) {
    const native = nativeModule();
    try {
      await native?.setLastScanMs?.(ms);
    } catch {
      // Ignore.
    }
  },

  async getNewScreenshots(sinceMs: number, limit = 8) {
    const native = nativeModule();
    if (!native) {
      return [];
    }
    try {
      const items = await native.getNewScreenshots(sinceMs, limit);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },

  async copyAsset(assetId: string, destPath: string) {
    const native = nativeModule();
    if (!native) {
      throw new Error('Screenshot detection is unavailable.');
    }
    const result = await native.copyAsset(assetId, destPath);
    if (result.path) {
      return result.path;
    }
    if (result.uri) {
      return result.uri;
    }
    throw new Error('Could not copy the screenshot.');
  },

  async deleteAsset(assetId: string) {
    const native = nativeModule();
    if (!native) {
      return {
        ok: false,
        cancelled: false,
        message: 'Screenshot detection is unavailable.',
      };
    }
    try {
      const result = await native.deleteAsset(assetId);
      return {
        ok: Boolean(result.ok),
        cancelled: Boolean(result.cancelled),
        message: result.message,
      };
    } catch {
      return {
        ok: false,
        cancelled: false,
        message:
          "We couldn't delete this screenshot, but nothing else was changed.",
      };
    }
  },

  async recognizeText(filePath: string) {
    const native = nativeModule();
    if (!native) {
      return {
        ok: false,
        text: '',
        message: 'On-device text recognition is unavailable.',
      };
    }
    try {
      const result = await native.recognizeText(filePath);
      return {
        ok: Boolean(result.ok),
        text: result.text ?? '',
        message: result.message,
      };
    } catch {
      return {
        ok: false,
        text: '',
        message: 'On-device text recognition failed.',
      };
    }
  },

  async setClipboard(text: string) {
    const native = nativeModule();
    if (!native) {
      return false;
    }
    try {
      const result = await native.setClipboard(text);
      return Boolean(result.ok);
    } catch {
      return false;
    }
  },
};

export const screenshotDetector = detector;

export function subscribeToScreenshotChanges(
  listener: () => void,
): EmitterSubscription {
  if (Platform.OS === 'ios' && nativeModule()) {
    const emitter = new NativeEventEmitter(
      NativeModules.ScreenshotDetector,
    );
    return emitter.addListener('onScreenshotsChanged', listener);
  }
  return DeviceEventEmitter.addListener('onScreenshotsChanged', listener);
}
