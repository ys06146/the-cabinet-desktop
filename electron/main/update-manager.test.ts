import { describe, expect, it, vi } from 'vitest';
import type { UpdateState } from '../shared/update';
import {
  AUTOMATIC_UPDATE_CHECK_DELAY_MS,
  UpdateManager,
  type UpdateClient,
  type UpdateManagerDependencies,
} from './update-manager';

type ClientEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';
type ClientListener = (...args: unknown[]) => void;

interface ScheduledCall {
  callback: () => void;
  delayMs: number;
}

function createClientHarness() {
  const listeners = new Map<ClientEvent, ClientListener[]>();
  const checkForUpdates = vi.fn(async () => undefined);
  const downloadUpdate = vi.fn(async () => undefined);
  const quitAndInstall = vi.fn();
  const on = vi.fn((event: ClientEvent, listener: ClientListener) => {
    const eventListeners = listeners.get(event) ?? [];
    eventListeners.push(listener);
    listeners.set(event, eventListeners);
  });
  const client = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: true,
    on,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } as unknown as UpdateClient;

  return {
    client,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    on,
    emit(event: ClientEvent, ...args: unknown[]) {
      for (const listener of listeners.get(event) ?? []) {
        listener(...args);
      }
    },
  };
}

function createHarness(overrides: Partial<UpdateManagerDependencies> = {}) {
  const clientHarness = createClientHarness();
  const scheduled: ScheduledCall[] = [];
  const broadcasts: UpdateState[] = [];
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const dependencies: UpdateManagerDependencies = {
    client: clientHarness.client,
    currentVersion: '0.1.0',
    isPackaged: true,
    broadcast: (state) => broadcasts.push(state),
    schedule: (callback, delayMs) => scheduled.push({ callback, delayMs }),
    confirmInstall: vi.fn(async () => true),
    prepareForInstall: vi.fn(async () => true),
    logger,
    setInstallationQuitReady: vi.fn(),
    ...overrides,
  };
  const manager = new UpdateManager(dependencies);

  return {
    manager,
    dependencies,
    clientHarness,
    scheduled,
    broadcasts,
    logger,
  };
}

async function reachDownloadedState(harness: ReturnType<typeof createHarness>) {
  harness.manager.start();
  await harness.manager.checkForUpdates();
  harness.clientHarness.emit('update-available', { version: '0.2.0' });
  await harness.manager.downloadUpdate();
  harness.clientHarness.emit('update-downloaded', { version: '0.2.0' });
  expect(harness.manager.getState().status).toBe('downloaded');
}

describe('UpdateManager startup', () => {
  it('does not configure, subscribe, schedule, or check in development', async () => {
    const harness = createHarness({ isPackaged: false });

    harness.manager.start();
    await harness.manager.checkForUpdates();

    expect(harness.clientHarness.client.autoDownload).toBe(true);
    expect(harness.clientHarness.client.autoInstallOnAppQuit).toBe(true);
    expect(harness.clientHarness.client.allowPrerelease).toBe(true);
    expect(harness.clientHarness.on).not.toHaveBeenCalled();
    expect(harness.scheduled).toHaveLength(0);
    expect(harness.clientHarness.checkForUpdates).not.toHaveBeenCalled();
    expect(harness.broadcasts).toHaveLength(0);
  });

  it('configures a packaged updater and schedules one delayed check only once', () => {
    const harness = createHarness();

    harness.manager.start();
    harness.manager.start();

    expect(harness.clientHarness.client.autoDownload).toBe(false);
    expect(harness.clientHarness.client.autoInstallOnAppQuit).toBe(false);
    expect(harness.clientHarness.client.allowPrerelease).toBe(false);
    expect(harness.clientHarness.on).toHaveBeenCalledTimes(6);
    expect(harness.scheduled).toEqual([
      expect.objectContaining({ delayMs: AUTOMATIC_UPDATE_CHECK_DELAY_MS }),
    ]);
  });

  it('runs the scheduled check as an automatic request', async () => {
    const harness = createHarness();
    harness.manager.start();

    harness.scheduled[0]?.callback();
    await vi.waitFor(() => {
      expect(harness.clientHarness.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    expect(harness.manager.getState()).toMatchObject({
      status: 'checking',
      checkTrigger: 'automatic',
    });
  });
});

describe('UpdateManager checks and downloads', () => {
  it('prevents a second check while one is already in progress', async () => {
    let finishCheck: (() => void) | undefined;
    const harness = createHarness();
    harness.clientHarness.checkForUpdates.mockImplementationOnce(
      () => new Promise<undefined>((resolve) => {
        finishCheck = () => resolve(undefined);
      }),
    );
    harness.manager.start();

    const firstCheck = harness.manager.checkForUpdates();
    const duplicateState = await harness.manager.checkForUpdates();

    expect(harness.clientHarness.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(duplicateState.status).toBe('checking');
    finishCheck?.();
    await firstCheck;
  });

  it('broadcasts availability, download progress, and completion', async () => {
    const harness = createHarness();
    harness.manager.start();
    await harness.manager.checkForUpdates();
    harness.clientHarness.emit('update-available', { version: '0.2.0' });

    await harness.manager.downloadUpdate();
    harness.clientHarness.emit('download-progress', { percent: 47.5 });
    harness.clientHarness.emit('update-downloaded', { version: '0.2.0' });

    expect(harness.clientHarness.downloadUpdate).toHaveBeenCalledTimes(1);
    expect(harness.broadcasts.map((state) => state.status)).toEqual([
      'checking',
      'available',
      'downloading',
      'downloading',
      'downloaded',
    ]);
    expect(harness.broadcasts[3]?.progressPercent).toBe(47.5);
    expect(harness.manager.getState()).toMatchObject({
      status: 'downloaded',
      progressPercent: 100,
    });
  });

  it('prevents duplicate downloads and turns raw failures into friendly text', async () => {
    let finishDownload: (() => void) | undefined;
    const harness = createHarness();
    harness.clientHarness.downloadUpdate.mockImplementationOnce(
      () => new Promise<undefined>((resolve) => {
        finishDownload = () => resolve(undefined);
      }),
    );
    harness.manager.start();
    await harness.manager.checkForUpdates();
    harness.clientHarness.emit('update-available', { version: '0.2.0' });

    const firstDownload = harness.manager.downloadUpdate();
    const duplicateState = await harness.manager.downloadUpdate();
    harness.clientHarness.emit('error', new Error('ENOTFOUND github.com'));
    finishDownload?.();
    await firstDownload;

    expect(harness.clientHarness.downloadUpdate).toHaveBeenCalledTimes(1);
    expect(duplicateState.status).toBe('downloading');
    expect(harness.manager.getState()).toMatchObject({
      status: 'error',
      errorMessage: expect.stringContaining('인터넷 연결'),
    });
  });
});

describe('UpdateManager installation', () => {
  it('does not install before a download is complete', async () => {
    const harness = createHarness();
    harness.manager.start();

    const result = await harness.manager.installUpdate();

    expect(result).toMatchObject({ status: 'blocked' });
    expect(harness.dependencies.confirmInstall).not.toHaveBeenCalled();
    expect(harness.clientHarness.quitAndInstall).not.toHaveBeenCalled();
  });

  it('does nothing else when the native confirmation is cancelled', async () => {
    const confirmInstall = vi.fn(async () => false);
    const prepareForInstall = vi.fn(async () => true);
    const harness = createHarness({ confirmInstall, prepareForInstall });
    await reachDownloadedState(harness);

    const result = await harness.manager.installUpdate();

    expect(result).toEqual({ status: 'cancelled' });
    expect(prepareForInstall).not.toHaveBeenCalled();
    expect(harness.clientHarness.quitAndInstall).not.toHaveBeenCalled();
  });

  it('blocks installation when pending data cannot be saved', async () => {
    const prepareForInstall = vi.fn(async () => false);
    const harness = createHarness({ prepareForInstall });
    await reachDownloadedState(harness);

    const result = await harness.manager.installUpdate();

    expect(result).toMatchObject({
      status: 'blocked',
      message: expect.stringContaining('저장하지 못해'),
    });
    expect(harness.clientHarness.quitAndInstall).not.toHaveBeenCalled();
  });

  it('blocks installation when saving throws and logs the private error', async () => {
    const privateError = new Error('sensitive storage detail');
    const harness = createHarness({
      prepareForInstall: vi.fn(async () => {
        throw privateError;
      }),
    });
    await reachDownloadedState(harness);

    const result = await harness.manager.installUpdate();

    expect(result).toMatchObject({ status: 'blocked' });
    expect(result).not.toHaveProperty('message', expect.stringContaining('sensitive'));
    expect(harness.logger.error).toHaveBeenCalledWith(
      'Unable to save data before update installation',
      privateError,
    );
    expect(harness.clientHarness.quitAndInstall).not.toHaveBeenCalled();
  });

  it('quits only after confirmation and successful persistence', async () => {
    const calls: string[] = [];
    const harness = createHarness({
      confirmInstall: async () => {
        calls.push('confirm');
        return true;
      },
      prepareForInstall: async () => {
        calls.push('prepare');
        return true;
      },
    });
    harness.clientHarness.quitAndInstall.mockImplementation(() => {
      calls.push('quit');
    });
    await reachDownloadedState(harness);

    const result = await harness.manager.installUpdate();

    expect(result).toEqual({ status: 'installing' });
    expect(calls).toEqual(['confirm', 'prepare', 'quit']);
    expect(harness.dependencies.setInstallationQuitReady).toHaveBeenCalledWith(
      true,
    );
    expect(harness.clientHarness.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('restores the ordinary close barrier when update installation cannot start', async () => {
    const setInstallationQuitReady = vi.fn();
    const harness = createHarness({ setInstallationQuitReady });
    harness.clientHarness.quitAndInstall.mockImplementation(() => {
      throw new Error('spawn failed');
    });
    await reachDownloadedState(harness);

    const result = await harness.manager.installUpdate();

    expect(result).toMatchObject({
      status: 'blocked',
      message: expect.stringContaining('시작하지 못했습니다'),
    });
    expect(setInstallationQuitReady.mock.calls).toEqual([[true], [false]]);
  });
});
