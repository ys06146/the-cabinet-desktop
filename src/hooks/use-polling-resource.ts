import { useCallback, useEffect, useRef, useState } from 'react';
import { reportApplicationError } from '../lib/report-error';
import { createRefreshScheduler } from './refresh-scheduler';

export interface PollingResource<T> {
  data: T | null;
  error: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  lastCheckedAt: string | null;
}

export function usePollingResource<T>(
  load: (() => Promise<T>) | null,
  intervalMs: number,
): PollingResource<T> & { refresh: () => void } {
  const [state, setState] = useState<PollingResource<T>>({
    data: null, error: null, status: load ? 'loading' : 'idle', lastCheckedAt: null,
  });
  const pending = useRef<Promise<void> | null>(null);
  const schedulerRef = useRef<ReturnType<typeof createRefreshScheduler> | null>(null);

  useEffect(() => {
    let active = true;
    setState({ data: null, error: null, status: load ? 'loading' : 'idle', lastCheckedAt: null });
    if (!load) return;

    const scheduler = createRefreshScheduler({
      intervalMs,
      isVisible: () => document.visibilityState !== 'hidden',
      task: async () => {
        // A changed symbol/filter waits for the previous IPC request to finish.
        // IPC cannot abort the network operation, but stale results never reach state.
        await pending.current;
        if (!active) return;
        const request = (async () => {
          setState((current) => ({ ...current, error: null, status: 'loading' }));
          try {
            const data = await load();
            if (active) setState({ data, error: null, status: 'ready', lastCheckedAt: new Date().toISOString() });
          } catch (error: unknown) {
            if (active) {
              reportApplicationError(error);
              setState((current) => ({
                ...current,
                error: error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.',
                status: 'error',
              }));
            }
          }
        })();
        pending.current = request;
        await request;
        if (pending.current === request) pending.current = null;
      },
    });
    schedulerRef.current = scheduler;
    const refresh = (): void => { void scheduler.refresh(); };
    document.addEventListener('visibilitychange', scheduler.visibilityChanged);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    refresh();
    return () => {
      active = false;
      scheduler.stop();
      if (schedulerRef.current === scheduler) schedulerRef.current = null;
      document.removeEventListener('visibilitychange', scheduler.visibilityChanged);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [intervalMs, load]);

  const refresh = useCallback(() => { void schedulerRef.current?.refresh(); }, []);
  return { ...state, refresh };
}
