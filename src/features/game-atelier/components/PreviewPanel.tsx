import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  PREVIEW_WORLD,
  createGamePreviewState,
  pauseGamePreview,
  restartGamePreview,
  resumeGamePreview,
  startGamePreview,
  stepGamePreview,
  type GamePreviewState,
  type PreviewDirectionKey,
} from '../../../domain/game-preview';

interface PreviewPanelProps {
  active: boolean;
  projectId: string;
}

const STATUS_LABELS: Record<GamePreviewState['status'], string> = {
  ready: '시작 전',
  playing: '플레이 중',
  paused: '일시정지',
  complete: '전체 수집 완료',
};

const KEY_DIRECTIONS: Readonly<Record<string, PreviewDirectionKey>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

function readColorToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? `rgb(${value})` : fallback;
}

function drawPreview(canvas: HTMLCanvasElement, state: GamePreviewState): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const background = readColorToken('--color-background', '#171613');
  const surface = readColorToken('--color-surface', '#24221e');
  const border = readColorToken('--color-border', '#494338');
  const accent = readColorToken('--color-accent', '#5a2027');
  const brass = readColorToken('--color-brass', '#b4945d');
  const text = readColorToken('--color-text', '#e8dfcc');
  const positive = readColorToken('--color-positive', '#7ea387');

  context.clearRect(0, 0, PREVIEW_WORLD.width, PREVIEW_WORLD.height);
  context.fillStyle = background;
  context.fillRect(0, 0, PREVIEW_WORLD.width, PREVIEW_WORLD.height);

  context.strokeStyle = border;
  context.lineWidth = 1;
  for (let x = 0; x <= PREVIEW_WORLD.width; x += 40) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, PREVIEW_WORLD.height);
    context.stroke();
  }
  for (let y = 0; y <= PREVIEW_WORLD.height; y += 40) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(PREVIEW_WORLD.width, y + 0.5);
    context.stroke();
  }

  context.fillStyle = surface;
  context.strokeStyle = border;
  context.lineWidth = 2;
  context.fillRect(18, 18, PREVIEW_WORLD.width - 36, PREVIEW_WORLD.height - 36);
  context.strokeRect(18, 18, PREVIEW_WORLD.width - 36, PREVIEW_WORLD.height - 36);

  context.fillStyle = accent;
  context.globalAlpha = 0.72;
  context.fillRect(304, 154, 126, 28);
  context.fillRect(548, 226, 112, 30);
  context.fillRect(86, 350, 96, 26);
  context.globalAlpha = 1;

  for (const collectible of state.collectibles) {
    if (collectible.collected) {
      continue;
    }
    const centerX = collectible.x + collectible.size / 2;
    const centerY = collectible.y + collectible.size / 2;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(Math.PI / 4);
    context.fillStyle = brass;
    context.fillRect(-collectible.size / 2, -collectible.size / 2, collectible.size, collectible.size);
    context.strokeStyle = text;
    context.strokeRect(-collectible.size / 2, -collectible.size / 2, collectible.size, collectible.size);
    context.restore();
  }

  context.fillStyle = accent;
  context.strokeStyle = brass;
  context.lineWidth = 3;
  context.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);
  context.strokeRect(state.player.x, state.player.y, state.player.size, state.player.size);
  context.fillStyle = text;
  context.fillRect(state.player.x + 8, state.player.y + 9, 5, 5);
  context.fillRect(state.player.x + 21, state.player.y + 9, 5, 5);

  if (state.status === 'paused' || state.status === 'complete') {
    context.fillStyle = 'rgb(0 0 0 / 0.64)';
    context.fillRect(0, 0, PREVIEW_WORLD.width, PREVIEW_WORLD.height);
    context.fillStyle = state.status === 'complete' ? positive : text;
    context.font = 'bold 28px Georgia, serif';
    context.textAlign = 'center';
    context.fillText(
      state.status === 'complete' ? '모든 기록물을 수집했습니다' : '일시정지',
      PREVIEW_WORLD.width / 2,
      PREVIEW_WORLD.height / 2,
    );
  }
}

export function PreviewPanel({ active, projectId }: PreviewPanelProps): React.JSX.Element {
  const [state, setState] = useState<GamePreviewState>(createGamePreviewState);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pressedKeysRef = useRef(new Set<PreviewDirectionKey>());
  const previousScoreRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousProjectIdRef = useRef(projectId);

  const focusCanvas = useCallback((): void => {
    requestAnimationFrame(() => canvasRef.current?.focus());
  }, []);

  const playTone = useCallback((complete: boolean): void => {
    if (!soundEnabled) {
      return;
    }
    try {
      const audioContext = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = audioContext;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = complete ? 660 : 440;
      gain.gain.setValueAtTime(0.04, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio is optional; a blocked audio device must not interrupt the prototype.
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (previousProjectIdRef.current === projectId) {
      return;
    }
    previousProjectIdRef.current = projectId;
    pressedKeysRef.current.clear();
    previousScoreRef.current = 0;
    setState(restartGamePreview());
  }, [projectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawPreview(canvas, state);
    }
  }, [state]);

  useEffect(() => {
    if (state.score > previousScoreRef.current) {
      playTone(state.status === 'complete');
    }
    previousScoreRef.current = state.score;
  }, [playTone, state.score, state.status]);

  useEffect(() => {
    if (!active || state.status !== 'playing') {
      pressedKeysRef.current.clear();
      return undefined;
    }

    let animationFrame = 0;
    let previousTime = performance.now();
    const animate = (time: number): void => {
      const elapsedSeconds = (time - previousTime) / 1_000;
      previousTime = time;
      setState((current) => stepGamePreview(current, pressedKeysRef.current, elapsedSeconds));
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [active, state.status]);

  useEffect(() => {
    const clearKeys = (): void => pressedKeysRef.current.clear();
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('blur', clearKeys);
      const audioContext = audioContextRef.current;
      if (audioContext) {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      event.preventDefault();
      pressedKeysRef.current.add(direction);
      setState((current) => startGamePreview(current));
      return;
    }
    if (event.code === 'Space' || event.code === 'KeyP') {
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      setState((current) =>
        current.status === 'playing'
          ? pauseGamePreview(current)
          : resumeGamePreview(current),
      );
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      event.preventDefault();
      pressedKeysRef.current.delete(direction);
    }
  };

  const total = state.collectibles.length;

  return (
    <section aria-labelledby="preview-panel-title" className="border border-cabinet-border bg-cabinet-surface/30">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-cabinet-border bg-cabinet-elevated px-4 py-4 sm:px-5">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
            Browser Canvas Prototype
          </p>
          <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="preview-panel-title">
            아이템 수집 게임
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-cabinet-muted">
            Unity 실행 결과가 아닌, 기획을 빠르게 확인하는 브라우저 Canvas 프로토타입입니다.
          </p>
        </div>
        <span className="border border-cabinet-warning/60 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-cabinet-warning">
          Unity 결과 아님
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-cabinet-border px-3 py-3 sm:px-4">
        <span className="mr-auto font-mono text-sm tabular-nums text-cabinet-text" aria-live="polite">
          현재 점수 {state.score} / {total}
        </span>
        <span className="border border-cabinet-border bg-cabinet-background px-2 py-1 text-xs text-cabinet-muted" role="status">
          {STATUS_LABELS[state.status]}
        </span>
        <button
          aria-pressed={soundEnabled}
          className="min-h-10 border border-cabinet-border px-3 text-xs text-cabinet-text hover:border-cabinet-brass"
          onClick={() => setSoundEnabled((enabled) => !enabled)}
          type="button"
        >
          사운드 {soundEnabled ? '켜짐' : '꺼짐'}
        </button>
        {state.status === 'ready' ? (
          <button
            className="min-h-10 border border-cabinet-brass bg-cabinet-accent px-4 text-xs font-bold text-cabinet-text"
            onClick={() => {
              setState((current) => startGamePreview(current));
              focusCanvas();
            }}
            type="button"
          >
            시작
          </button>
        ) : null}
        {state.status === 'playing' ? (
          <button
            className="min-h-10 border border-cabinet-border px-4 text-xs text-cabinet-text hover:border-cabinet-brass"
            onClick={() => setState((current) => pauseGamePreview(current))}
            type="button"
          >
            일시정지
          </button>
        ) : null}
        {state.status === 'paused' ? (
          <button
            className="min-h-10 border border-cabinet-brass bg-cabinet-accent px-4 text-xs font-bold text-cabinet-text"
            onClick={() => {
              setState((current) => resumeGamePreview(current));
              focusCanvas();
            }}
            type="button"
          >
            계속하기
          </button>
        ) : null}
        <button
          className="min-h-10 border border-cabinet-border px-4 text-xs text-cabinet-text hover:border-cabinet-negative"
          onClick={() => {
            pressedKeysRef.current.clear();
            previousScoreRef.current = 0;
            setState(restartGamePreview());
            focusCanvas();
          }}
          type="button"
        >
          다시 시작
        </button>
      </div>

      <div className="p-2 sm:p-4">
        <canvas
          aria-describedby="preview-controls-help"
          aria-label={`아이템 수집 게임. 현재 점수 ${state.score}, 전체 ${total}. WASD 또는 방향키로 이동합니다.`}
          className="block aspect-[16/9] h-auto w-full border border-cabinet-border bg-cabinet-background focus-visible:border-cabinet-brass"
          data-preview-player-x={state.player.x.toFixed(2)}
          data-preview-player-y={state.player.y.toFixed(2)}
          data-preview-score={state.score}
          data-preview-status={state.status}
          height={PREVIEW_WORLD.height}
          onBlur={() => pressedKeysRef.current.clear()}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          ref={canvasRef}
          role="application"
          tabIndex={0}
          width={PREVIEW_WORLD.width}
        >
          이 브라우저는 Canvas 프로토타입을 표시할 수 없습니다.
        </canvas>
        <p className="mt-3 text-xs leading-5 text-cabinet-muted" id="preview-controls-help">
          Canvas를 클릭하거나 Tab으로 초점을 옮긴 뒤 WASD 또는 방향키로 이동하세요. Space 또는 P로 일시정지할 수 있습니다. 다른 탭을 보는 동안 진행은 멈추고 돌아오면 같은 점수와 위치에서 이어집니다.
        </p>
      </div>
    </section>
  );
}
