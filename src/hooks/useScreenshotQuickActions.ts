import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import RNFS from 'react-native-fs';
import { useScreenshots } from '../context/ScreenshotsContext';
import { useNotice } from '../context/NoticeContext';
import {
  LOOKBACK,
  screenshotDetector,
  subscribeToScreenshotChanges,
  onQuickActionsPrefChanged,
  notifyQuickActionsPrefChanged,
  type ScreenshotAsset,
  type ScreenshotDetectorCapabilities,
  UNSUPPORTED_CAPABILITIES,
} from '../screenshotDetection';
import { getProcessedAsset, markAssetProcessed } from '../screenshotActions';
import { getScreenshotBySourceAssetId } from '../services/screenshotsRepository';
import { getPreference, setPreference } from '../storage';
import { toDisplayUri } from '../utils/imageUri';
import notifee, { EventType } from '@notifee/react-native';
import {
  handleQuickActionEvent,
  setupScreenshotNotificationHandlers,
} from '../notifications/ScreenshotNotificationService';

export function useScreenshotQuickActions() {
  const { refresh } = useScreenshots();
  const { showNotice } = useNotice();
  const [enabled, setEnabled] = useState(false);
  const [queue, setQueue] = useState<ScreenshotAsset[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [capabilities, setCapabilities] =
    useState<ScreenshotDetectorCapabilities>(UNSUPPORTED_CAPABILITIES);
  const scanningRef = useRef(false);

  const current = queue[0] ?? null;

  const reloadEnabled = useCallback(async () => {
    const value = await getPreference('screenshotQuickActions');
    setEnabled(value === '1');
  }, []);

  const enqueue = useCallback((assets: ScreenshotAsset[]) => {
    setQueue(currentQueue => {
      const ids = new Set(currentQueue.map(item => item.id));
      const next = assets.filter(item => !ids.has(item.id));
      return next.length ? [...currentQueue, ...next] : currentQueue;
    });
  }, []);

  const scan = useCallback(
    async (sinceMs: number): Promise<number> => {
      if (scanningRef.current) {
        return 0;
      }
      scanningRef.current = true;
      try {
        const assets = await screenshotDetector.getNewScreenshots(
          sinceMs,
          LOOKBACK.limit,
        );
        const fresh: ScreenshotAsset[] = [];
        for (const asset of assets) {
          const processed = await getProcessedAsset(asset.id);
          if (processed) {
            continue;
          }
          const existing = await getScreenshotBySourceAssetId(asset.id);
          if (existing) {
            await markAssetProcessed({
              photoAssetId: asset.id,
              status: 'saved',
              screenshotId: existing.id,
            });
            continue;
          }
          fresh.push(asset);
        }
        if (fresh.length) {
          enqueue(fresh);
          await screenshotDetector.scanAndNotify();
        }
        const now = Date.now();
        await setPreference('screenshotQuickLastScan', String(now));
        await screenshotDetector.setLastScanMs(now);
        return fresh.length;
      } finally {
        scanningRef.current = false;
      }
    },
    [enqueue],
  );

  const processNewScreenshots = useCallback(async () => {
    const caps = await screenshotDetector.getCapabilities();
    setCapabilities(caps);
    if (!caps.supported) {
      showNotice({ title: 'Not available', body: caps.summary });
      return;
    }

    const permission = await screenshotDetector.requestPermission();
    if (permission !== 'authorized' && permission !== 'limited') {
      showNotice({
        title: 'Photo access needed',
        body: 'SnapMind needs access to your photos to organize screenshots you choose to save.',
      });
      return;
    }

    await screenshotDetector.start();
    await setupScreenshotNotificationHandlers();
    await setPreference('screenshotQuickActions', '1');
    notifyQuickActionsPrefChanged();
    const found = await scan(Date.now() - LOOKBACK.scanMs);
    if (found === 0) {
      showNotice({
        title: 'No new screenshots',
        body: 'Nothing new in the last 24 hours, or these were already processed.',
      });
    }
  }, [scan, showNotice]);

  useEffect(() => {
    reloadEnabled();
    screenshotDetector.getCapabilities().then(setCapabilities).catch(() => undefined);
    setupScreenshotNotificationHandlers().catch(() => undefined);

    const unsubscribeNotifee = notifee.onForegroundEvent(event => {
      if (event.type === EventType.ACTION_PRESS) {
        handleQuickActionEvent(event).then(() => refresh()).catch(() => undefined);
      }
    });
    const unsubscribePref = onQuickActionsPrefChanged(() => {
      reloadEnabled().catch(() => undefined);
    });

    return () => {
      unsubscribeNotifee();
      unsubscribePref();
    };
  }, [refresh, reloadEnabled]);

  useEffect(() => {
    if (!enabled) {
      screenshotDetector.stop().catch(() => undefined);
      return;
    }

    const onAppState = (state: AppStateStatus) => {
      // iOS goes inactive while the system screenshot UI is up.
      // Keep watching so we still receive the screenshot event.
      if (state === 'active') {
        screenshotDetector.start().catch(() => undefined);
        getPreference('screenshotQuickLastScan')
          .then(value => {
            const last = Number(value ?? 0);
            const since = last > 0 ? last : Date.now() - 2 * 60 * 1000;
            return scan(since);
          })
          .catch(() => undefined);
      }
    };

    screenshotDetector.getPermissionStatus().then(status => {
      if (status === 'authorized' || status === 'limited') {
        screenshotDetector.start().catch(() => undefined);
        getPreference('screenshotQuickLastScan')
          .then(value => {
            const last = Number(value ?? 0);
            const since = last > 0 ? last : Date.now() - 30 * 1000;
            return scan(since);
          })
          .catch(() => undefined);
      }
    });

    const appSub = AppState.addEventListener('change', onAppState);
    const nativeSub = subscribeToScreenshotChanges(() => {
      scan(Date.now() - 2 * 60 * 1000).catch(() => undefined);
    });

    return () => {
      appSub.remove();
      nativeSub.remove();
    };
  }, [enabled, scan]);

  useEffect(() => {
    if (!current) {
      setPreviewUri(null);
      return;
    }
    let cancelled = false;
    const dest = `${RNFS.CachesDirectoryPath}/snapmind-quick-${current.id.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
    screenshotDetector
      .copyAsset(current.id, dest)
      .then(path => {
        if (!cancelled) {
          setPreviewUri(toDisplayUri(path));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUri(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  const completeCurrent = useCallback(
    async (shouldRefresh: boolean) => {
      setQueue(items => items.slice(1));
      if (shouldRefresh) {
        await refresh();
      }
    },
    [refresh],
  );

  return {
    enabled,
    current,
    previewUri,
    capabilities,
    processNewScreenshots,
    completeCurrent,
    reloadEnabled,
  };
}
