export const PREVIEW_WORLD = Object.freeze({
  width: 800,
  height: 450,
});

export const PREVIEW_PLAYER_SIZE = 34;
export const PREVIEW_PLAYER_SPEED = 220;

export type PreviewStatus = 'ready' | 'playing' | 'paused' | 'complete';
export type PreviewDirectionKey = 'up' | 'down' | 'left' | 'right';

export interface PreviewPlayer {
  x: number;
  y: number;
  size: number;
}

export interface PreviewCollectible {
  id: string;
  x: number;
  y: number;
  size: number;
  collected: boolean;
}

export interface GamePreviewState {
  status: PreviewStatus;
  player: PreviewPlayer;
  collectibles: PreviewCollectible[];
  score: number;
  elapsedSeconds: number;
}

const INITIAL_COLLECTIBLES: readonly Omit<PreviewCollectible, 'collected'>[] = [
  { id: 'folio-01', x: 138, y: 92, size: 24 },
  { id: 'folio-02', x: 372, y: 76, size: 24 },
  { id: 'folio-03', x: 650, y: 118, size: 24 },
  { id: 'folio-04', x: 232, y: 306, size: 24 },
  { id: 'folio-05', x: 492, y: 272, size: 24 },
  { id: 'folio-06', x: 704, y: 354, size: 24 },
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function overlaps(
  first: { x: number; y: number; size: number },
  second: { x: number; y: number; size: number },
): boolean {
  return (
    first.x < second.x + second.size &&
    first.x + first.size > second.x &&
    first.y < second.y + second.size &&
    first.y + first.size > second.y
  );
}

export function createGamePreviewState(): GamePreviewState {
  return {
    status: 'ready',
    player: { x: 58, y: 208, size: PREVIEW_PLAYER_SIZE },
    collectibles: INITIAL_COLLECTIBLES.map((collectible) => ({
      ...collectible,
      collected: false,
    })),
    score: 0,
    elapsedSeconds: 0,
  };
}

export function startGamePreview(state: GamePreviewState): GamePreviewState {
  if (state.status !== 'ready') {
    return state;
  }
  return { ...state, status: 'playing' };
}

export function pauseGamePreview(state: GamePreviewState): GamePreviewState {
  return state.status === 'playing' ? { ...state, status: 'paused' } : state;
}

export function resumeGamePreview(state: GamePreviewState): GamePreviewState {
  return state.status === 'paused' ? { ...state, status: 'playing' } : state;
}

export function restartGamePreview(): GamePreviewState {
  return createGamePreviewState();
}

export function stepGamePreview(
  state: GamePreviewState,
  pressedKeys: ReadonlySet<PreviewDirectionKey>,
  elapsedSeconds: number,
): GamePreviewState {
  if (state.status !== 'playing' || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return state;
  }

  const horizontal = Number(pressedKeys.has('right')) - Number(pressedKeys.has('left'));
  const vertical = Number(pressedKeys.has('down')) - Number(pressedKeys.has('up'));
  const magnitude = Math.hypot(horizontal, vertical);
  const safeElapsed = Math.min(elapsedSeconds, 0.05);
  const distance = PREVIEW_PLAYER_SPEED * safeElapsed;
  const player = magnitude === 0
    ? state.player
    : {
        ...state.player,
        x: clamp(
          state.player.x + (horizontal / magnitude) * distance,
          0,
          PREVIEW_WORLD.width - state.player.size,
        ),
        y: clamp(
          state.player.y + (vertical / magnitude) * distance,
          0,
          PREVIEW_WORLD.height - state.player.size,
        ),
      };

  let collectedCount = 0;
  const collectibles = state.collectibles.map((collectible) => {
    if (collectible.collected || !overlaps(player, collectible)) {
      return collectible;
    }
    collectedCount += 1;
    return { ...collectible, collected: true };
  });
  const score = state.score + collectedCount;
  const status = score === collectibles.length ? 'complete' : state.status;

  return {
    ...state,
    status,
    player,
    collectibles,
    score,
    elapsedSeconds: state.elapsedSeconds + safeElapsed,
  };
}
