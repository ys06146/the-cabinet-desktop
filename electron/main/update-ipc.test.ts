import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS, type UpdatePreparationResponse } from '../shared/ipc';
import { createInitialUpdateState } from './update-state-machine';
import {
  registerUpdateIpcHandlers,
  type UpdateIpcRegistrar,
  type UpdateManagerPort,
} from './update-ipc';

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function createFixture() {
  const handlers = new Map<string, Handler>();
  const registrar: UpdateIpcRegistrar = {
    handle: (channel, listener) => handlers.set(channel, listener),
  };
  const state = createInitialUpdateState('0.1.0');
  const manager: UpdateManagerPort = {
    getState: vi.fn(() => state),
    checkForUpdates: vi.fn(async () => ({ ...state, status: 'checking' as const })),
    downloadUpdate: vi.fn(async () => ({ ...state, status: 'downloading' as const })),
    installUpdate: vi.fn(async () => ({ status: 'cancelled' as const })),
  };
  const preparation = {
    complete: vi.fn((senderId: number, response: UpdatePreparationResponse) => {
      void senderId;
      void response;
      return true;
    }),
  };
  const assertTrusted = vi.fn();

  registerUpdateIpcHandlers(
    registrar,
    assertTrusted,
    manager,
    preparation as never,
  );

  const event = { sender: { id: 41 } } as IpcMainInvokeEvent;
  const invoke = (channel: string, ...args: unknown[]) => {
    const handler = handlers.get(channel);
    if (!handler) {
      throw new Error(`Missing handler for ${channel}`);
    }
    return handler(event, ...args);
  };
  return { assertTrusted, handlers, invoke, manager, preparation };
}

describe('update IPC', () => {
  it('registers only the explicit updater command channels', () => {
    const { handlers } = createFixture();
    expect([...handlers.keys()].sort()).toEqual(
      [
        IPC_CHANNELS.getUpdateState,
        IPC_CHANNELS.checkForUpdates,
        IPC_CHANNELS.downloadUpdate,
        IPC_CHANNELS.installUpdate,
        IPC_CHANNELS.completeUpdatePreparation,
      ].sort(),
    );
  });

  it('guards and delegates updater commands without exposing the updater object', async () => {
    const { assertTrusted, invoke, manager } = createFixture();
    await invoke(IPC_CHANNELS.checkForUpdates);
    await invoke(IPC_CHANNELS.downloadUpdate);
    await invoke(IPC_CHANNELS.installUpdate);

    expect(assertTrusted).toHaveBeenCalledTimes(3);
    expect(manager.checkForUpdates).toHaveBeenCalledOnce();
    expect(manager.downloadUpdate).toHaveBeenCalledOnce();
    expect(manager.installUpdate).toHaveBeenCalledOnce();
  });

  it('accepts a bounded preparation response only from the trusted sender', () => {
    const { invoke, preparation } = createFixture();
    expect(
      invoke(IPC_CHANNELS.completeUpdatePreparation, {
        requestId: 3,
        success: false,
        message: `저장 실패 ${'x'.repeat(600)}`,
      }),
    ).toBe(true);
    expect(preparation.complete).toHaveBeenCalledOnce();
    const response = preparation.complete.mock.calls[0]?.[1];
    expect(response).toMatchObject({ requestId: 3, success: false });
    expect(response?.message).toHaveLength(500);
    expect(response?.message).toMatch(/^저장 실패 /u);
  });

  it('rejects malformed preparation acknowledgements', () => {
    const { invoke, preparation } = createFixture();
    expect(() =>
      invoke(IPC_CHANNELS.completeUpdatePreparation, {
        requestId: 0,
        success: true,
        extra: 'not allowed',
      }),
    ).toThrow('invalid');
    expect(preparation.complete).not.toHaveBeenCalled();
  });
});
