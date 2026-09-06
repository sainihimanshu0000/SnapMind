import type { Category } from '../constants/categories';

export type PhotoPermissionStatus =
  | 'authorized'
  | 'limited'
  | 'denied'
  | 'notDetermined'
  | 'unavailable';

export type ScreenshotAsset = {
  id: string;
  createdAt: number;
  width: number;
  height: number;
  filename?: string;
  mediaType?: string;
};

export type ScreenshotDetectorCapabilities = {
  supported: boolean;
  platform: 'ios' | 'android' | 'unknown';
  automaticForeground: boolean;
  automaticBackground: boolean;
  canDeleteFromLibrary: boolean;
  canRunOnDeviceOcr: boolean;
  summary: string;
};

export type DetectorInterface = {
  isSupported(): Promise<boolean>;
  getCapabilities(): Promise<ScreenshotDetectorCapabilities>;
  getPermissionStatus(): Promise<PhotoPermissionStatus>;
  requestPermission(): Promise<PhotoPermissionStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  scanAndNotify(): Promise<void>;
  setLastScanMs(ms: number): Promise<void>;
  getNewScreenshots(sinceMs: number, limit?: number): Promise<ScreenshotAsset[]>;
  copyAsset(assetId: string, destPath: string): Promise<string>;
  deleteAsset(assetId: string): Promise<{
    ok: boolean;
    cancelled: boolean;
    message?: string;
  }>;
  recognizeText(filePath: string): Promise<{
    ok: boolean;
    text: string;
    message?: string;
  }>;
  setClipboard(text: string): Promise<boolean>;
};

export const UNSUPPORTED_CAPABILITIES: ScreenshotDetectorCapabilities = {
  supported: false,
  platform: 'unknown',
  automaticForeground: false,
  automaticBackground: false,
  canDeleteFromLibrary: false,
  canRunOnDeviceOcr: false,
  summary:
    'This platform does not provide a public API for detecting new screenshots.',
};

export const LOOKBACK = {
  scanMs: 24 * 60 * 60 * 1000,
  limit: 8,
} as const;

export type SuggestedQuickAction = {
  id: 'save' | 'delete' | 'remind' | 'organize' | 'extract' | 'favorite' | 'buy';
  label: string;
};

export function suggestedActionsForCategory(category: Category): {
  title: string;
  extras: SuggestedQuickAction[];
} {
  if (category === 'Shopping') {
    return {
      title: 'Shopping screenshot detected',
      extras: [
        { id: 'buy', label: 'Buy' },
        { id: 'remind', label: 'Remind' },
      ],
    };
  }
  if (category === 'Travel') {
    return {
      title: 'Travel screenshot detected',
      extras: [
        { id: 'organize', label: 'Add to collection' },
        { id: 'remind', label: 'Remind' },
      ],
    };
  }
  if (category === 'Learning') {
    return {
      title: 'Learning screenshot detected',
      extras: [
        { id: 'save', label: 'Save' },
        { id: 'remind', label: 'Remind' },
      ],
    };
  }
  return {
    title: 'New screenshot',
    extras: [
      { id: 'remind', label: 'Remind' },
      { id: 'organize', label: 'Organize' },
    ],
  };
}
