import type { IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS, type UpdatePreparationResponse } from '../shared/ipc';
import type { UpdateInstallResult, UpdateState } from '../shared/update';
import type { UpdateInstallPreparationCoordinator } from './update-install-preparation';

export interface UpdateManagerPort {
  checkForUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  getState: () => UpdateState;
  installUpdate: () => Promise<UpdateInstallResult>;
}

export interface UpdateIpcRegistrar {
  handle: (
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown,
  ) => void;
}

export type UpdateIpcSenderGuard = (event: IpcMainInvokeEvent) => void;

function sanitizePreparationResponse(value: unknown): UpdatePreparationResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Update preparation response must be an object');
  }
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (
    keys.some((key) => !['requestId', 'success', 'message'].includes(key)) ||
    !Object.hasOwn(candidate, 'requestId') ||
    !Object.hasOwn(candidate, 'success') ||
    !Number.isSafeInteger(candidate.requestId) ||
    Number(candidate.requestId) <= 0 ||
    typeof candidate.success !== 'boolean' ||
    (candidate.message !== undefined && typeof candidate.message !== 'string')
  ) {
    throw new TypeError('Update preparation response is invalid');
  }

  return {
    requestId: Number(candidate.requestId),
    success: candidate.success,
    message:
      typeof candidate.message === 'string'
        ? candidate.message.trim().slice(0, 500)
        : undefined,
  };
}

export function registerUpdateIpcHandlers(
  registrar: UpdateIpcRegistrar,
  assertTrusted: UpdateIpcSenderGuard,
  manager: UpdateManagerPort,
  preparation: UpdateInstallPreparationCoordinator,
): void {
  registrar.handle(IPC_CHANNELS.getUpdateState, (event): UpdateState => {
    assertTrusted(event);
    return manager.getState();
  });
  registrar.handle(IPC_CHANNELS.checkForUpdates, async (event): Promise<UpdateState> => {
    assertTrusted(event);
    return manager.checkForUpdates();
  });
  registrar.handle(IPC_CHANNELS.downloadUpdate, async (event): Promise<UpdateState> => {
    assertTrusted(event);
    return manager.downloadUpdate();
  });
  registrar.handle(
    IPC_CHANNELS.installUpdate,
    async (event): Promise<UpdateInstallResult> => {
      assertTrusted(event);
      return manager.installUpdate();
    },
  );
  registrar.handle(
    IPC_CHANNELS.completeUpdatePreparation,
    (event, value: unknown): boolean => {
      assertTrusted(event);
      const response = sanitizePreparationResponse(value);
      return preparation.complete(event.sender.id, response);
    },
  );
}
