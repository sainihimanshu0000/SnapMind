import React, { useEffect } from 'react';
import { QuickActionSheet } from '../components/QuickActionSheet';
import { registerProcessNewScreenshots } from '../screenshotDetection';
import { useScreenshotQuickActions } from '../hooks/useScreenshotQuickActions';

export function ScreenshotQuickActionsHost() {
  const {
    current,
    previewUri,
    capabilities,
    processNewScreenshots,
    completeCurrent,
  } = useScreenshotQuickActions();

  useEffect(() => {
    registerProcessNewScreenshots(processNewScreenshots);
    return () => registerProcessNewScreenshots(null);
  }, [processNewScreenshots]);

  return (
    <QuickActionSheet
      asset={current}
      previewUri={previewUri}
      capabilities={capabilities}
      onDone={shouldRefresh => {
        completeCurrent(shouldRefresh).catch(() => undefined);
      }}
    />
  );
}
