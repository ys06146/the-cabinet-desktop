import { describe, expect, it, vi } from 'vitest';
import { WindowCloseGuard } from './window-close-guard';

function createHarness(
  prepare: () => Promise<void> = async () => undefined,
  shouldBypass: () => boolean = () => false,
) {
  const onBlocked = vi.fn();
  const guard = new WindowCloseGuard({ onBlocked, prepare, shouldBypass });
  const event = { preventDefault: vi.fn() };
  const target = { close: vi.fn(), isDestroyed: vi.fn(() => false) };
  return { event, guard, onBlocked, target };
}

describe('WindowCloseGuard', () => {
  it('keeps the window open until pending user data has been saved', async () => {
    let finishSave: (() => void) | undefined;
    const harness = createHarness(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );

    harness.guard.handle(harness.event, harness.target);
    expect(harness.event.preventDefault).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(finishSave).toBeTypeOf('function'));
    expect(harness.target.close).not.toHaveBeenCalled();

    finishSave?.();
    await vi.waitFor(() => expect(harness.target.close).toHaveBeenCalledTimes(1));
  });

  it('coalesces repeated close attempts while saving', async () => {
    let finishSave: (() => void) | undefined;
    const prepare = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    const harness = createHarness(prepare);

    harness.guard.handle(harness.event, harness.target);
    harness.guard.handle(harness.event, harness.target);
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));

    finishSave?.();
    await vi.waitFor(() => expect(harness.target.close).toHaveBeenCalledTimes(1));
  });

  it('blocks close on save failure and allows a later retry', async () => {
    const prepare = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);
    const harness = createHarness(prepare);

    harness.guard.handle(harness.event, harness.target);
    await vi.waitFor(() => expect(harness.onBlocked).toHaveBeenCalledTimes(1));
    expect(harness.target.close).not.toHaveBeenCalled();

    harness.guard.handle(harness.event, harness.target);
    await vi.waitFor(() => expect(harness.target.close).toHaveBeenCalledTimes(1));
  });

  it('does not intercept the close initiated by an approved update install', () => {
    const harness = createHarness(async () => undefined, () => true);

    harness.guard.handle(harness.event, harness.target);

    expect(harness.event.preventDefault).not.toHaveBeenCalled();
    expect(harness.target.close).not.toHaveBeenCalled();
  });
});
