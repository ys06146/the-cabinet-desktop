import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  GAME_PROJECT_WORKSPACE_LIMITS,
  type SceneObject,
  type SceneObjectType,
  type SceneState,
} from '../../../domain/game-project-workspace';
import {
  MIN_SCENE_OBJECT_SIZE,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  clamp,
  clientPointToScenePoint,
  findTopmostSceneObject,
  moveSceneObject,
  removeSceneObject,
  replaceSceneObject,
  resizeSceneObject,
  type ScenePoint,
} from './scene-editor-geometry';

export type SceneTool = 'select' | 'move' | 'resize' | 'delete';

const SCENE_OBJECT_TYPE_LABELS: Record<SceneObjectType, string> = {
  player: '플레이어',
  enemy: '적',
  floor: '바닥',
  obstacle: '장애물',
  item: '아이템',
  camera: '카메라',
  ui: 'UI',
};

const TOOL_LABELS: Record<SceneTool, string> = {
  select: '선택',
  move: '이동',
  resize: '크기 변경',
  delete: '삭제',
};

const OBJECT_COLORS: Record<SceneObjectType, string> = {
  player: '--color-brass',
  enemy: '--color-negative',
  floor: '--color-text-muted',
  obstacle: '--color-warning',
  item: '--color-positive',
  camera: '--color-accent',
  ui: '--color-text',
};

export interface SceneEditorProps {
  onChange: (scene: SceneState) => void;
  onRun: () => void;
  scene: SceneState;
}

interface DragState {
  object: SceneObject;
  pointerId: number;
  startPoint: ScenePoint;
}

interface CanvasPalette {
  background: string;
  border: string;
  brass: string;
  elevated: string;
  objectColors: Record<SceneObjectType, string>;
  text: string;
}

function readDesignToken(token: string, fallback: string, alpha = 1): string {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  const channels = value || fallback;
  return `rgb(${channels} / ${alpha})`;
}

function createCanvasPalette(): CanvasPalette {
  const objectColors = Object.fromEntries(
    Object.entries(OBJECT_COLORS).map(([type, token]) => [
      type,
      readDesignToken(token, '180 148 93', 0.62),
    ]),
  ) as Record<SceneObjectType, string>;

  return {
    background: readDesignToken('--color-background', '23 22 19'),
    border: readDesignToken('--color-border', '73 67 56', 0.72),
    brass: readDesignToken('--color-brass', '180 148 93'),
    elevated: readDesignToken('--color-surface-elevated', '44 41 36'),
    objectColors,
    text: readDesignToken('--color-text', '232 223 204'),
  };
}

function drawSceneCanvas(
  canvas: HTMLCanvasElement,
  scene: SceneState,
  selectedObjectId: string | null,
): void {
  const rectangle = canvas.getBoundingClientRect();
  if (rectangle.width <= 0 || rectangle.height <= 0) {
    return;
  }

  const devicePixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const pixelWidth = Math.max(1, Math.round(rectangle.width * devicePixelRatio));
  const pixelHeight = Math.max(1, Math.round(rectangle.height * devicePixelRatio));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const palette = createCanvasPalette();
  context.setTransform(pixelWidth / SCENE_WIDTH, 0, 0, pixelHeight / SCENE_HEIGHT, 0, 0);
  context.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

  if (scene.gridVisible) {
    context.beginPath();
    for (let x = 0; x <= SCENE_WIDTH; x += 30) {
      context.moveTo(x, 0);
      context.lineTo(x, SCENE_HEIGHT);
    }
    for (let y = 0; y <= SCENE_HEIGHT; y += 30) {
      context.moveTo(0, y);
      context.lineTo(SCENE_WIDTH, y);
    }
    context.lineWidth = 1;
    context.strokeStyle = palette.border;
    context.stroke();
  }

  for (const object of scene.objects) {
    const selected = object.id === selectedObjectId;
    context.save();
    context.fillStyle = palette.elevated;
    context.strokeStyle = selected ? palette.brass : palette.objectColors[object.type];
    context.lineWidth = selected ? 4 : 2;
    context.setLineDash(object.type === 'camera' ? [10, 7] : []);
    context.fillRect(object.x, object.y, object.width, object.height);
    context.strokeRect(object.x, object.y, object.width, object.height);

    const label = `${SCENE_OBJECT_TYPE_LABELS[object.type]} · ${object.name}`;
    context.fillStyle = palette.text;
    context.font = '600 14px "Segoe UI", sans-serif';
    context.textBaseline = 'top';
    context.save();
    context.beginPath();
    context.rect(object.x, object.y, object.width, object.height);
    context.clip();
    context.fillText(label, object.x + 7, object.y + 7);
    context.restore();

    if (selected) {
      context.setLineDash([]);
      context.fillStyle = palette.brass;
      context.fillRect(object.x + object.width - 7, object.y + object.height - 7, 14, 14);
    }
    context.restore();
  }
}

function ToolButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      aria-pressed={active}
      className={`min-h-10 rounded-cabinet-sm border px-3 text-xs font-bold transition-colors ${
        active
          ? 'border-cabinet-brass bg-cabinet-accent text-cabinet-text'
          : 'border-cabinet-border bg-cabinet-background/55 text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function InspectorNumberField({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}): React.JSX.Element {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextValue = event.currentTarget.valueAsNumber;
    if (Number.isFinite(nextValue)) {
      onChange(clamp(nextValue, min, max));
    }
  };

  return (
    <label className="min-w-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cabinet-muted">
      {label}
      <input
        className="mt-1.5 min-h-10 w-full min-w-0 rounded-cabinet-sm border border-cabinet-border bg-cabinet-background px-2 font-mono text-sm tabular-nums text-cabinet-text"
        max={max}
        min={min}
        onChange={handleChange}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

export function SceneEditor({ onChange, onRun, scene }: SceneEditorProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<DragState | null>(null);
  const instructionsId = useId();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    () => scene.objects[0]?.id ?? null,
  );
  const [statusMessage, setStatusMessage] = useState('Scene 편집기가 준비되었습니다.');
  const [tool, setTool] = useState<SceneTool>('select');
  const selectedObject = useMemo(
    () => scene.objects.find((object) => object.id === selectedObjectId) ?? null,
    [scene.objects, selectedObjectId],
  );

  useEffect(() => {
    if (selectedObjectId && !scene.objects.some((object) => object.id === selectedObjectId)) {
      setSelectedObjectId(scene.objects[0]?.id ?? null);
    }
  }, [scene.objects, selectedObjectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const redraw = (): void => drawSceneCanvas(canvas, scene, selectedObjectId);
    redraw();
    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [scene, selectedObjectId]);

  const updateObject = (nextObject: SceneObject): void => {
    onChange(replaceSceneObject(scene, nextObject));
  };

  const deleteObject = (object: SceneObject): void => {
    onChange(removeSceneObject(scene, object.id));
    setSelectedObjectId(null);
    setStatusMessage(`${object.name} 객체를 Scene에서 삭제했습니다.`);
  };

  const pointFromPointer = (event: PointerEvent<HTMLCanvasElement>): ScenePoint => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return clientPointToScenePoint(
      { x: event.clientX, y: event.clientY },
      rectangle,
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.focus();
    const point = pointFromPointer(event);
    const object = findTopmostSceneObject(scene.objects, point);
    if (!object) {
      setSelectedObjectId(null);
      setStatusMessage('빈 공간을 선택했습니다.');
      return;
    }

    setSelectedObjectId(object.id);
    if (tool === 'delete') {
      deleteObject(object);
      return;
    }

    setStatusMessage(`${object.name} 객체를 선택했습니다.`);
    if (tool === 'move' || tool === 'resize') {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = {
        object,
        pointerId: event.pointerId,
        startPoint: point,
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const point = pointFromPointer(event);
    const delta = {
      x: point.x - drag.startPoint.x,
      y: point.y - drag.startPoint.y,
    };
    const nextObject = tool === 'resize'
      ? resizeSceneObject(drag.object, delta)
      : moveSceneObject(drag.object, delta);
    updateObject(nextObject);
  };

  const finishPointerInteraction = (event: PointerEvent<HTMLCanvasElement>): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setStatusMessage(
      tool === 'resize'
        ? `${drag.object.name} 객체의 크기를 변경했습니다.`
        : `${drag.object.name} 객체를 이동했습니다.`,
    );
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObject) {
      event.preventDefault();
      deleteObject(selectedObject);
      return;
    }
    if (event.key === 'Escape') {
      setSelectedObjectId(null);
      setStatusMessage('객체 선택을 해제했습니다.');
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      event.preventDefault();
      onChange({ ...scene, gridVisible: !scene.gridVisible });
      setStatusMessage(scene.gridVisible ? '격자를 숨겼습니다.' : '격자를 표시했습니다.');
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      onRun();
      return;
    }
    if (!selectedObject || !event.key.startsWith('Arrow')) {
      return;
    }

    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const delta = {
      x: event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0,
      y: event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0,
    };
    updateObject(
      tool === 'resize'
        ? resizeSceneObject(selectedObject, delta)
        : moveSceneObject(selectedObject, delta),
    );
    setStatusMessage(
      tool === 'resize'
        ? `${selectedObject.name} 객체 크기를 키보드로 조절했습니다.`
        : `${selectedObject.name} 객체를 키보드로 이동했습니다.`,
    );
  };

  return (
    <section aria-labelledby="scene-editor-title" className="min-w-0">
      <div className="border-b border-cabinet-border pb-4">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
          2D Scene Editor
        </p>
        <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="scene-editor-title">
          Scene
        </h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-cabinet-muted">
          Scene(씬)은 게임의 한 화면을 구성하는 작업 공간입니다. 이 편집 내용은 Unity 실행 결과가 아니라 기획용 2D 배치 초안입니다.
        </p>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[13rem_minmax(0,1fr)_17rem]">
        <aside aria-labelledby="scene-object-list-title" className="min-w-0 border border-cabinet-border bg-cabinet-surface/40">
          <div className="border-b border-cabinet-border bg-cabinet-elevated px-3 py-3">
            <h4 className="font-serif text-lg text-cabinet-text" id="scene-object-list-title">
              객체 목록
            </h4>
            <p className="mt-1 text-[0.65rem] leading-4 text-cabinet-muted">
              객체(GameObject)는 Scene에 놓인 하나의 요소입니다.
            </p>
          </div>
          <ul className="grid min-w-0 grid-cols-2 gap-px bg-cabinet-border p-px sm:grid-cols-3 xl:grid-cols-1">
            {scene.objects.map((object) => (
              <li className="min-w-0 bg-cabinet-surface" key={object.id}>
                <button
                  aria-pressed={selectedObjectId === object.id}
                  className={`min-h-12 w-full min-w-0 px-3 py-2 text-left ${
                    selectedObjectId === object.id
                      ? 'bg-cabinet-accent text-cabinet-text'
                      : 'text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text'
                  }`}
                  onClick={() => {
                    setSelectedObjectId(object.id);
                    setStatusMessage(`${object.name} 객체를 선택했습니다.`);
                  }}
                  type="button"
                >
                  <span className="block truncate text-xs font-bold">
                    {SCENE_OBJECT_TYPE_LABELS[object.type]}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[0.6rem] opacity-70">
                    {object.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {scene.objects.length === 0 ? (
            <p className="px-3 py-5 text-xs leading-5 text-cabinet-muted">
              Scene에 남은 객체가 없습니다.
            </p>
          ) : null}
        </aside>

        <div className="min-w-0 border border-cabinet-border bg-cabinet-surface/35">
          <div aria-label="Scene 도구" className="flex flex-wrap gap-1.5 border-b border-cabinet-border bg-cabinet-elevated/70 p-2" role="toolbar">
            {(Object.keys(TOOL_LABELS) as SceneTool[]).map((candidate) => (
              <ToolButton
                active={tool === candidate}
                key={candidate}
                label={TOOL_LABELS[candidate]}
                onClick={() => {
                  setTool(candidate);
                  setStatusMessage(`${TOOL_LABELS[candidate]} 도구를 선택했습니다.`);
                }}
              />
            ))}
            <button
              aria-pressed={scene.gridVisible}
              className={`min-h-10 rounded-cabinet-sm border px-3 text-xs font-bold ${
                scene.gridVisible
                  ? 'border-cabinet-brass bg-cabinet-elevated text-cabinet-text'
                  : 'border-cabinet-border bg-cabinet-background/55 text-cabinet-muted hover:text-cabinet-text'
              }`}
              onClick={() => {
                onChange({ ...scene, gridVisible: !scene.gridVisible });
                setStatusMessage(scene.gridVisible ? '격자를 숨겼습니다.' : '격자를 표시했습니다.');
              }}
              type="button"
            >
              격자
            </button>
            <button
              className="ml-auto min-h-10 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-4 text-xs font-bold text-cabinet-text hover:bg-cabinet-accent/80"
              onClick={onRun}
              type="button"
            >
              실행
            </button>
          </div>

          <div className="min-w-0 p-2 sm:p-3">
            <p className="sr-only" id={instructionsId}>
              객체를 포인터로 선택하세요. 이동 또는 크기 변경 도구에서는 드래그할 수 있습니다. 화살표 키는 한 칸, Shift와 화살표 키는 열 칸씩 조절합니다. Delete 키로 삭제하고, G 키로 격자를 전환하며, R 키로 실행합니다.
            </p>
            <canvas
              aria-describedby={instructionsId}
              aria-label="게임 Scene 2D Canvas"
              className="block aspect-video w-full touch-none rounded-cabinet-sm border border-cabinet-border bg-cabinet-background focus-visible:outline-cabinet-brass"
              onKeyDown={handleCanvasKeyDown}
              onPointerCancel={finishPointerInteraction}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              ref={canvasRef}
              role="application"
              tabIndex={0}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] leading-4 text-cabinet-muted">
              <span className="font-mono tabular-nums">960 × 540 · 2D Canvas</span>
              <span>포인터 드래그 · 화살표 이동 · Shift + 화살표 10px</span>
            </div>
            <p aria-live="polite" className="sr-only">{statusMessage}</p>
          </div>
        </div>

        <aside aria-labelledby="scene-inspector-title" className="min-w-0 border border-cabinet-border bg-cabinet-surface/40">
          <div className="border-b border-cabinet-border bg-cabinet-elevated px-3 py-3">
            <h4 className="font-serif text-lg text-cabinet-text" id="scene-inspector-title">
              Inspector
            </h4>
            <p className="mt-1 text-[0.65rem] leading-4 text-cabinet-muted">
              Inspector(속성 창)는 선택한 객체의 값을 고치는 곳입니다.
            </p>
          </div>

          {selectedObject ? (
            <div className="space-y-4 p-3">
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cabinet-muted">
                이름
                <input
                  className="mt-1.5 min-h-10 w-full min-w-0 rounded-cabinet-sm border border-cabinet-border bg-cabinet-background px-2 text-sm text-cabinet-text"
                  maxLength={80}
                  onChange={(event) => {
                    if (event.currentTarget.value.length > 0) {
                      updateObject({ ...selectedObject, name: event.currentTarget.value });
                    }
                  }}
                  type="text"
                  value={selectedObject.name}
                />
              </label>

              <fieldset>
                <legend className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cabinet-brass">위치</legend>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
                  <InspectorNumberField label="X" max={SCENE_WIDTH - selectedObject.width} min={0} onChange={(x) => updateObject({ ...selectedObject, x })} value={selectedObject.x} />
                  <InspectorNumberField label="Y" max={SCENE_HEIGHT - selectedObject.height} min={0} onChange={(y) => updateObject({ ...selectedObject, y })} value={selectedObject.y} />
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cabinet-brass">크기</legend>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
                  <InspectorNumberField label="너비" max={SCENE_WIDTH - selectedObject.x} min={MIN_SCENE_OBJECT_SIZE} onChange={(width) => updateObject({ ...selectedObject, width })} value={selectedObject.width} />
                  <InspectorNumberField label="높이" max={SCENE_HEIGHT - selectedObject.y} min={MIN_SCENE_OBJECT_SIZE} onChange={(height) => updateObject({ ...selectedObject, height })} value={selectedObject.height} />
                </div>
              </fieldset>

              <InspectorNumberField
                label="이동 속도"
                max={GAME_PROJECT_WORKSPACE_LIMITS.maxMoveSpeed}
                min={0}
                onChange={(moveSpeed) => updateObject({ ...selectedObject, moveSpeed })}
                step={0.5}
                value={selectedObject.moveSpeed}
              />

              <div className="space-y-3 border-t border-cabinet-border pt-4">
                <label className="flex min-h-11 items-start gap-3 text-sm text-cabinet-text">
                  <input
                    checked={selectedObject.collisionEnabled}
                    className="mt-1 h-4 w-4 accent-cabinet-brass"
                    onChange={(event) => updateObject({ ...selectedObject, collisionEnabled: event.currentTarget.checked })}
                    type="checkbox"
                  />
                  <span>
                    <span className="font-bold">충돌 여부</span>
                    <span className="mt-1 block text-[0.65rem] leading-4 text-cabinet-muted">
                      Collider 2D: 서로 겹치거나 부딪히는 영역을 감지합니다.
                    </span>
                  </span>
                </label>
                <label className="flex min-h-11 items-start gap-3 text-sm text-cabinet-text">
                  <input
                    checked={selectedObject.gravityEnabled}
                    className="mt-1 h-4 w-4 accent-cabinet-brass"
                    onChange={(event) => updateObject({ ...selectedObject, gravityEnabled: event.currentTarget.checked })}
                    type="checkbox"
                  />
                  <span>
                    <span className="font-bold">중력 여부</span>
                    <span className="mt-1 block text-[0.65rem] leading-4 text-cabinet-muted">
                      Gravity Scale: 객체를 아래로 끌어당기는 힘을 적용할지 정합니다.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <p className="px-3 py-6 text-sm leading-6 text-cabinet-muted">
              왼쪽 목록이나 Canvas에서 객체를 선택하면 이름, 위치, 크기와 동작 값을 확인할 수 있습니다.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
