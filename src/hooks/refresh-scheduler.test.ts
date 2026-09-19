import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler } from './refresh-scheduler';

afterEach(() => { vi.useRealTimers(); });

describe('background workspace refresh scheduler', () => {
  it.each([60_000, 300_000])('refreshes after %i ms and restarts the interval after a manual refresh', async (intervalMs) => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const scheduler = createRefreshScheduler({ intervalMs, isVisible: () => true, task });
    await scheduler.refresh();
    await vi.advanceTimersByTimeAsync(20_000);
    await scheduler.refresh();
    await vi.advanceTimersByTimeAsync(intervalMs - 1);
    expect(task).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(3);
    scheduler.stop();
  });

  it('coalesces focus, online, manual and timer refreshes while a request is in flight', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const task = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const scheduler = createRefreshScheduler({ intervalMs: 60_000, isVisible: () => true, task });
    const first = scheduler.refresh();
    await scheduler.refresh();
    scheduler.visibilityChanged();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    await first;
    scheduler.stop();
  });

  it('continues five-minute polling while hidden and refreshes when visible again', async () => {
    vi.useFakeTimers();
    let visible = true;
    const task = vi.fn(async () => undefined);
    const scheduler = createRefreshScheduler({ intervalMs: 300_000, isVisible: () => visible, task });
    await scheduler.refresh();
    visible = false;
    scheduler.visibilityChanged();
    await vi.advanceTimersByTimeAsync(900_000);
    expect(task).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(1);
    visible = true;
    scheduler.visibilityChanged();
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(5);
    scheduler.stop();
  });

  it('starts and continues one-minute polling even when initially hidden', async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const scheduler = createRefreshScheduler({ intervalMs: 60_000, isVisible: () => false, task });
    await scheduler.refresh();
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(task).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('removes timers on cleanup and cannot restart after an in-flight request finishes', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const task = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const scheduler = createRefreshScheduler({ intervalMs: 60_000, isVisible: () => true, task });
    const request = scheduler.refresh();
    scheduler.stop();
    finish();
    await request;
    await vi.advanceTimersByTimeAsync(300_000);
    scheduler.visibilityChanged();
    await scheduler.refresh();
    expect(task).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
