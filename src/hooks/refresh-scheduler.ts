interface RefreshSchedulerOptions {
  intervalMs: number;
  isVisible: () => boolean;
  task: () => Promise<void>;
}

/** Keep polling while mounted, including hidden windows, with only one request in flight. */
export function createRefreshScheduler({ intervalMs, isVisible, task }: RefreshSchedulerOptions) {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const refresh = async (): Promise<void> => {
    if (stopped || running) return;
    clearTimeout(timer);
    running = true;
    try {
      await task();
    } finally {
      running = false;
      if (!stopped) timer = setTimeout(() => { void refresh(); }, intervalMs);
    }
  };

  return {
    refresh,
    visibilityChanged: (): void => {
      if (isVisible()) void refresh();
    },
    stop: (): void => { stopped = true; clearTimeout(timer); },
  };
}
