import { describe, expect, it, vi } from 'vitest';
import { UpdateSaveCoordinator } from './update-save-coordinator';

describe('UpdateSaveCoordinator', () => {
  it('flushes every registered data source before update installation', async () => {
    const coordinator = new UpdateSaveCoordinator();
    const saved: string[] = [];
    coordinator.register('memo', '투자 메모', () => {
      saved.push('memo');
    });
    coordinator.register('game', '게임 프로젝트', async () => {
      saved.push('game');
    });

    await coordinator.flushAll();
    expect(saved.sort()).toEqual(['game', 'memo']);
  });

  it('waits for a save started while a feature is unmounting', async () => {
    const coordinator = new UpdateSaveCoordinator();
    let release = (): void => undefined;
    const saving = new Promise<void>((resolve) => {
      release = resolve;
    });
    const unregister = coordinator.register('workspace', '게임 제작 화면', () => saving);
    unregister();

    const flush = coordinator.flushAll();
    let completed = false;
    void flush.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);

    release();
    await flush;
    expect(completed).toBe(true);
  });

  it('reports the failing data source and blocks preparation', async () => {
    const coordinator = new UpdateSaveCoordinator();
    coordinator.register('draft', '미완료 입력', () => {
      throw new Error('저장 공간을 사용할 수 없습니다.');
    });

    await expect(coordinator.flushAll()).rejects.toThrow(
      '미완료 입력 저장에 실패했습니다',
    );
  });

  it('retries the captured payload after an unmount save failed', async () => {
    const coordinator = new UpdateSaveCoordinator();
    let attempts = 0;
    const unregister = coordinator.register('memo', '투자 메모', () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('disk unavailable');
      }
    });
    unregister();
    await Promise.resolve();
    await Promise.resolve();

    await expect(coordinator.flushAll()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });
  it('replaces a stale registration with the active feature instance', async () => {
    const coordinator = new UpdateSaveCoordinator();
    const stale = vi.fn();
    const active = vi.fn();
    const unregisterStale = coordinator.register('memo', '투자 메모', stale);
    coordinator.register('memo', '투자 메모', active);
    unregisterStale();

    await coordinator.flushAll();
    expect(stale).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledOnce();
  });
});
