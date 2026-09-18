import { describe, expect, it } from 'vitest';
import {
  getWindowMinimumSize,
  normalizeWindowState,
  WINDOW_DEFAULTS,
} from './window-state';

const primaryDisplay = { x: 0, y: 0, width: 1920, height: 1040 };

describe('normalizeWindowState', () => {
  it('uses the requested defaults when no state has been saved', () => {
    expect(normalizeWindowState(undefined, [primaryDisplay])).toEqual({
      width: 1440,
      height: 900,
    });
  });

  it('restores a valid position and maximized state', () => {
    expect(
      normalizeWindowState(
        { x: 100, y: 80, width: 1300, height: 800, isMaximized: true },
        [primaryDisplay],
      ),
    ).toEqual({ x: 100, y: 80, width: 1300, height: 800, isMaximized: true });
  });

  it('returns the window to the primary display when a monitor was removed', () => {
    expect(
      normalizeWindowState(
        { x: 3000, y: 100, width: 1400, height: 900, isMaximized: false },
        [primaryDisplay],
      ),
    ).toEqual({ width: WINDOW_DEFAULTS.width, height: WINDOW_DEFAULTS.height });
  });

  it('keeps restored dimensions above the configured minimum', () => {
    const state = normalizeWindowState(
      { x: 10, y: 10, width: 500, height: 400, isMaximized: false },
      [primaryDisplay],
    );

    expect(state.width).toBe(WINDOW_DEFAULTS.minWidth);
    expect(state.height).toBe(WINDOW_DEFAULTS.minHeight);
  });
  it('fits the initial window inside a high-DPI work area smaller than defaults', () => {
    const scaledWorkArea = { x: 0, y: 0, width: 1093, height: 614 };

    expect(normalizeWindowState(undefined, [scaledWorkArea])).toEqual({
      width: 1093,
      height: 614,
    });
    expect(getWindowMinimumSize(scaledWorkArea)).toEqual({
      width: 1093,
      height: 614,
    });
  });

  it('never restores minimum bounds beyond the selected display work area', () => {
    const scaledWorkArea = { x: 30, y: 20, width: 1280, height: 680 };
    const state = normalizeWindowState(
      { x: 30, y: 20, width: 700, height: 400, isMaximized: false },
      [scaledWorkArea],
    );

    expect(state).toEqual({
      x: 30,
      y: 20,
      width: 1100,
      height: 680,
      isMaximized: false,
    });
  });
});
