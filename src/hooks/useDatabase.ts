import { useEffect, useState } from 'react';
import { getDatabase } from '../database';

type DatabaseStatus = 'loading' | 'ready' | 'error';

export function useDatabase() {
  const [status, setStatus] = useState<DatabaseStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getDatabase()
      .then(() => {
        if (mounted) {
          setStatus('ready');
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Database failed to open');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { status, error, isReady: status === 'ready' };
}
