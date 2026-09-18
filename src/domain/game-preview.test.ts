import { describe, expect, it } from 'vitest';
import {
  createGamePreviewState,
  pauseGamePreview,
  restartGamePreview,
  resumeGamePreview,
  startGamePreview,
  stepGamePreview,
  type GamePreviewState,
} from './game-preview';

describe('game preview engine', () => {
  it('moves on the first input step and clamps long frames', () => {
    const started = startGamePreview(createGamePreviewState());
    const moved = stepGamePreview(started, new Set(['right']), 1 / 60);
    const longFrame = stepGamePreview(moved, new Set(['right']), 2);

    expect(moved.player.x).toBeGreaterThan(started.player.x);
    expect(longFrame.player.x - moved.player.x).toBeLessThanOrEqual(11);
  });

  it('collects overlapping items, increases score, and completes the set', () => {
    const base = startGamePreview(createGamePreviewState());
    const overlapping: GamePreviewState = {
      ...base,
      player: { x: 100, y: 100, size: 34 },
      collectibles: [
        { id: 'one', x: 105, y: 105, size: 24, collected: false },
        { id: 'two', x: 105, y: 105, size: 24, collected: false },
      ],
    };
    const completed = stepGamePreview(overlapping, new Set(), 1 / 60);

    expect(completed.score).toBe(2);
    expect(completed.collectibles.every(({ collected }) => collected)).toBe(true);
    expect(completed.status).toBe('complete');
  });

  it('keeps start idempotent and makes repeated restart deterministic', () => {
    const started = startGamePreview(createGamePreviewState());
    expect(startGamePreview(started)).toBe(started);

    const restartedOnce = restartGamePreview();
    const restartedTwice = restartGamePreview();
    expect(restartedTwice).toEqual(restartedOnce);
    expect(restartedTwice).not.toBe(restartedOnce);
  });

  it('does not advance while paused and resumes the same session', () => {
    const playing = startGamePreview(createGamePreviewState());
    const paused = pauseGamePreview(playing);
    expect(stepGamePreview(paused, new Set(['down']), 1 / 60)).toBe(paused);
    expect(startGamePreview(paused)).toBe(paused);
    expect(resumeGamePreview(paused).status).toBe('playing');
  });
});
