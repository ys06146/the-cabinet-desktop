import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdateInstallPreparationCoordinator } from './update-install-preparation';

afterEach(() => {
  vi.useRealTimers();
});

describe('UpdateInstallPreparationCoordinator', () => {
  it('resolves only a matching response from the requesting renderer', async () => {
    const sent: unknown[] = [];
    const coordinator = new UpdateInstallPreparationCoordinator('update:prepare', 1_000);
    const promise = coordinator.request({
      id: 7,
      isDestroyed: () => false,
      send: (_channel, request) => sent.push(request),
    });

    expect(sent).toEqual([{ requestId: 1 }]);
    expect(coordinator.complete(9, { requestId: 1, success: true })).toBe(false);
    expect(coordinator.complete(7, { requestId: 1, success: true })).toBe(true);
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects and keeps the app open when renderer saving fails', async () => {
    const coordinator = new UpdateInstallPreparationCoordinator('update:prepare', 1_000);
    const promise = coordinator.request({
      id: 3,
      isDestroyed: () => false,
      send: () => undefined,
    });

    coordinator.complete(3, {
      requestId: 1,
      success: false,
      message: '투자 메모를 저장하지 못했습니다.',
    });

    await expect(promise).rejects.toThrow('투자 메모를 저장하지 못했습니다.');
  });

  it('times out rather than permitting an unacknowledged update install', async () => {
    vi.useFakeTimers();
    const coordinator = new UpdateInstallPreparationCoordinator('update:prepare', 500);
    const promise = coordinator.request({
      id: 3,
      isDestroyed: () => false,
      send: () => undefined,
    });
    const assertion = expect(promise).rejects.toThrow('시간이 초과');

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('does not send a request to a destroyed renderer', async () => {
    const coordinator = new UpdateInstallPreparationCoordinator('update:prepare');
    await expect(
      coordinator.request({
        id: 2,
        isDestroyed: () => true,
        send: () => {
          throw new Error('must not send');
        },
      }),
    ).rejects.toThrow('창을 찾지 못했습니다');
  });
});
