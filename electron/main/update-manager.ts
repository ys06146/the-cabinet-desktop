import type {
  UpdateCheckTrigger,
  UpdateInstallResult,
  UpdateState,
} from '../shared/update';
import {
  createInitialUpdateState,
  reduceUpdateState,
  toUserFriendlyUpdateError,
  type UpdateStateEvent,
} from './update-state-machine';

export const AUTOMATIC_UPDATE_CHECK_DELAY_MS = 15_000;

export interface UpdateVersionInfo {
  version: string;
}

export interface UpdateDownloadProgress {
  percent: number;
}

export interface UpdateClient {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  on(event: 'checking-for-update', listener: () => void): unknown;
  on(
    event: 'update-available' | 'update-not-available' | 'update-downloaded',
    listener: (info: UpdateVersionInfo) => void,
  ): unknown;
  on(
    event: 'download-progress',
    listener: (progress: UpdateDownloadProgress) => void,
  ): unknown;
  on(event: 'error', listener: (error: unknown) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent: boolean, isForceRunAfter: boolean): void;
}

export interface UpdateManagerLogger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
}

export interface UpdateManagerDependencies {
  client: UpdateClient;
  currentVersion: string;
  isPackaged: boolean;
  broadcast: (state: UpdateState) => void;
  schedule: (callback: () => void, delayMs: number) => unknown;
  confirmInstall: () => boolean | Promise<boolean>;
  prepareForInstall: () => boolean | void | Promise<boolean | void>;
  logger: UpdateManagerLogger;
  setInstallationQuitReady: (ready: boolean) => void;
}

const SAVE_BLOCKED_MESSAGE =
  '사용자 데이터를 저장하지 못해 업데이트 설치를 중단했습니다. 앱의 입력 내용을 확인한 뒤 다시 시도해 주세요.';
const CONFIRMATION_ERROR_MESSAGE =
  '업데이트 설치 확인 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.';
const INSTALL_START_ERROR_MESSAGE =
  '업데이트 설치를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const UPDATE_NOT_READY_MESSAGE =
  '설치할 업데이트가 아직 준비되지 않았습니다. 다운로드가 끝난 뒤 다시 시도해 주세요.';

export class UpdateManager {
  private state: UpdateState;
  private started = false;
  private nextRequestId = 0;
  private installAttempt: Promise<UpdateInstallResult> | null = null;

  constructor(private readonly dependencies: UpdateManagerDependencies) {
    this.state = createInitialUpdateState(dependencies.currentVersion);
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  start(): void {
    if (!this.dependencies.isPackaged || this.started) {
      return;
    }

    this.started = true;
    const { client } = this.dependencies;
    client.autoDownload = false;
    client.autoInstallOnAppQuit = false;
    client.allowPrerelease = false;
    this.bindClientEvents();

    this.dependencies.schedule(() => {
      void this.runCheck('automatic');
    }, AUTOMATIC_UPDATE_CHECK_DELAY_MS);
    this.dependencies.logger.info('Automatic update check scheduled', {
      delayMs: AUTOMATIC_UPDATE_CHECK_DELAY_MS,
    });
  }

  checkForUpdates(): Promise<UpdateState> {
    return this.runCheck('manual');
  }

  async downloadUpdate(): Promise<UpdateState> {
    if (
      !this.dependencies.isPackaged ||
      !this.started ||
      this.state.status !== 'available' ||
      this.state.requestId === null
    ) {
      return this.getState();
    }

    const requestId = this.state.requestId;
    this.transition({ type: 'DOWNLOAD_STARTED', requestId });

    try {
      await this.dependencies.client.downloadUpdate();
    } catch (error) {
      this.dependencies.logger.error('Update download failed', error);
      this.transition({
        type: 'FAILED',
        requestId,
        message: toUserFriendlyUpdateError(error),
      });
    }

    return this.getState();
  }

  installUpdate(): Promise<UpdateInstallResult> {
    if (this.installAttempt) {
      return this.installAttempt;
    }

    if (
      !this.dependencies.isPackaged ||
      !this.started ||
      this.state.status !== 'downloaded'
    ) {
      return Promise.resolve({
        status: 'blocked',
        message: UPDATE_NOT_READY_MESSAGE,
      });
    }

    const attempt = this.performInstall().finally(() => {
      if (this.installAttempt === attempt) {
        this.installAttempt = null;
      }
    });
    this.installAttempt = attempt;
    return attempt;
  }

  private async runCheck(trigger: UpdateCheckTrigger): Promise<UpdateState> {
    if (!this.dependencies.isPackaged || !this.started) {
      return this.getState();
    }

    const requestId = this.nextRequestId + 1;
    const previousState = this.state;
    this.transition({ type: 'CHECK_REQUESTED', requestId, trigger });
    if (this.state === previousState) {
      return this.getState();
    }
    this.nextRequestId = requestId;

    try {
      await this.dependencies.client.checkForUpdates();
    } catch (error) {
      this.dependencies.logger.error('Update check failed', error);
      this.transition({
        type: 'FAILED',
        requestId,
        message: toUserFriendlyUpdateError(error),
      });
    }

    return this.getState();
  }

  private bindClientEvents(): void {
    const { client } = this.dependencies;

    client.on('checking-for-update', () => {
      this.dependencies.logger.info('Checking for updates');
    });
    client.on('update-available', (info) => {
      this.withActiveRequest((requestId) => {
        this.transition({
          type: 'UPDATE_AVAILABLE',
          requestId,
          version: info.version,
        });
      });
    });
    client.on('update-not-available', () => {
      this.withActiveRequest((requestId) => {
        this.transition({ type: 'UPDATE_NOT_AVAILABLE', requestId });
      });
    });
    client.on('download-progress', (progress) => {
      this.withActiveRequest((requestId) => {
        this.transition({
          type: 'DOWNLOAD_PROGRESS',
          requestId,
          percent: progress.percent,
        });
      });
    });
    client.on('update-downloaded', (info) => {
      this.withActiveRequest((requestId) => {
        this.transition({
          type: 'UPDATE_DOWNLOADED',
          requestId,
          version: info.version,
        });
      });
    });
    client.on('error', (error) => {
      this.withActiveRequest((requestId) => {
        this.dependencies.logger.error('Updater emitted an error', error);
        this.transition({
          type: 'FAILED',
          requestId,
          message: toUserFriendlyUpdateError(error),
        });
      });
    });
  }

  private withActiveRequest(callback: (requestId: number) => void): void {
    if (this.state.requestId !== null) {
      callback(this.state.requestId);
    }
  }

  private transition(event: UpdateStateEvent): void {
    const nextState = reduceUpdateState(this.state, event);
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    try {
      this.dependencies.broadcast(this.getState());
    } catch (error) {
      this.dependencies.logger.warn('Unable to broadcast update state', error);
    }
  }

  private async performInstall(): Promise<UpdateInstallResult> {
    let confirmed: boolean;
    try {
      confirmed = await this.dependencies.confirmInstall();
    } catch (error) {
      this.dependencies.logger.error('Unable to confirm update installation', error);
      return { status: 'blocked', message: CONFIRMATION_ERROR_MESSAGE };
    }

    if (!confirmed) {
      return { status: 'cancelled' };
    }

    try {
      const prepared = await this.dependencies.prepareForInstall();
      if (prepared === false) {
        this.dependencies.logger.warn('Update installation blocked by unsaved data');
        return { status: 'blocked', message: SAVE_BLOCKED_MESSAGE };
      }
    } catch (error) {
      this.dependencies.logger.error('Unable to save data before update installation', error);
      return { status: 'blocked', message: SAVE_BLOCKED_MESSAGE };
    }

    try {
      this.dependencies.setInstallationQuitReady(true);
      this.dependencies.client.quitAndInstall(false, true);
      return { status: 'installing' };
    } catch (error) {
      this.dependencies.logger.error('Unable to start update installation', error);
      this.dependencies.setInstallationQuitReady(false);
      return { status: 'blocked', message: INSTALL_START_ERROR_MESSAGE };
    }
  }
}
