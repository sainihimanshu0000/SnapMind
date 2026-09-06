import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ScreenshotWithMeta } from '../types';
import { listScreenshots } from '../services/screenshotsRepository';

type ScreenshotsContextValue = {
  screenshots: ScreenshotWithMeta[];
  loading: boolean;
  refresh: () => Promise<void>;
  getById: (id: string) => ScreenshotWithMeta | undefined;
};

const ScreenshotsContext = createContext<ScreenshotsContextValue | null>(null);

export function ScreenshotsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [screenshots, setScreenshots] = useState<ScreenshotWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await listScreenshots({ filter: 'All', limit: 2000 });
      setScreenshots(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ScreenshotsContextValue>(
    () => ({
      screenshots,
      loading,
      refresh,
      getById: id => screenshots.find(shot => shot.id === id),
    }),
    [screenshots, loading, refresh],
  );

  return (
    <ScreenshotsContext.Provider value={value}>
      {children}
    </ScreenshotsContext.Provider>
  );
}

export function useScreenshots() {
  const ctx = useContext(ScreenshotsContext);
  if (!ctx) {
    throw new Error('useScreenshots must be used within ScreenshotsProvider');
  }
  return ctx;
}

export { filterScreenshots } from '../utils/filterScreenshots';
