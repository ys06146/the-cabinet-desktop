import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../shared/ipc';
import type { EnvironmentConfig } from './environment';
import { assertTrustedSender } from './ipc';
import { logger } from './logger';
import {
  UpdateInstallPreparationCoordinator,
  type UpdatePreparationTarget,
} from './update-install-preparation';
import { registerUpdateIpcHandlers } from './update-ipc';
import { UpdateManager, type UpdateClient } from './update-manager';

export interface UpdateRuntime {
  dispose: () => void;
  isInstallationQuitReady: () => boolean;
  prepareForClose: () => Promise<void>;
  start: () => void;
}

function getPreparationTarget(window: BrowserWindow): UpdatePreparationTarget {
  return {
    id: window.webContents.id,
    isDestroyed: () => window.isDestroyed() || window.webContents.isDestroyed(),
    send: (channel, request) => window.webContents.send(channel, request),
  };
}

export function initializeUpdateRuntime(
  config: EnvironmentConfig,
  getMainWindow: () => BrowserWindow | null,
): UpdateRuntime {
  const preparation = new UpdateInstallPreparationCoordinator(
    IPC_CHANNELS.prepareUpdateInstall,
  );

  let installationQuitReady = false;
  const requestRendererSave = async (): Promise<void> => {
    const window = getMainWindow();
    if (!window || window.isDestroyed()) {
      throw new Error('Main window is not available for data save preparation');
    }
    await preparation.request(getPreparationTarget(window));
  };

  autoUpdater.disableWebInstaller = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = {
    info: (message?: unknown) => logger.info('Updater', message),
    warn: (message?: unknown) => logger.warn('Updater', message),
    error: (message?: unknown) => logger.error('Updater', message),
  };

  const manager = new UpdateManager({
    client: autoUpdater as unknown as UpdateClient,
    currentVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    broadcast: (state) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.updateStateChanged, state);
        }
      }
    },
    schedule: (callback, delayMs) => setTimeout(callback, delayMs),
    confirmInstall: async () => {
      const window = getMainWindow();
      if (!window || window.isDestroyed()) {
        throw new Error('Main window is not available for update confirmation');
      }
      const result = await dialog.showMessageBox(window, {
        type: 'question',
        title: 'The Cabinet 업데이트',
        message: '앱을 재시작하고 업데이트를 설치할까요?',
        detail:
          '먼저 메모, 게임 프로젝트와 작성 중인 입력을 저장합니다. 저장에 실패하면 앱을 종료하지 않습니다.',
        buttons: ['재시작하고 설치', '나중에'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      return result.response === 0;
    },
    prepareForInstall: requestRendererSave,
    setInstallationQuitReady: (ready) => {
      installationQuitReady = ready;
    },
    logger,
  });

  registerUpdateIpcHandlers(
    ipcMain,
    (event) => assertTrustedSender(event, config),
    manager,
    preparation,
  );

  return {
    dispose: () => preparation.dispose(),
    isInstallationQuitReady: () => installationQuitReady,
    prepareForClose: requestRendererSave,
    start: () => manager.start(),
  };
}
