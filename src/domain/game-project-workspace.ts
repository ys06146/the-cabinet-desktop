export const GAME_SCENE_SIZE = Object.freeze({ width: 960, height: 540 });

export const SCENE_OBJECT_TYPES = [
  'player',
  'enemy',
  'floor',
  'obstacle',
  'item',
  'camera',
  'ui',
] as const;

export const SCRIPT_FILE_IDS = [
  'Assets/Scripts/PlayerMovement.cs',
  'Assets/Scripts/GameManager.cs',
  'Assets/Scripts/Collectible.cs',
] as const;

export const GAME_TASK_STATUSES = ['todo', 'in-progress', 'done'] as const;
export const GAME_TASK_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const MAIN_SCENE_FILE_ID = 'Assets/Scenes/MainScene.unity' as const;

export const GAME_PROJECT_WORKSPACE_LIMITS = Object.freeze({
  maxProjectIdCharacters: 128,
  maxSceneObjects: 200,
  maxObjectNameCharacters: 120,
  maxObjectIdCharacters: 128,
  maxMoveSpeed: 1_000,
  maxScriptCharacters: 200_000,
  maxInstructionCharacters: 500,
  maxScriptRevision: 100_000,
  maxTasks: 100,
  maxTaskTitleCharacters: 240,
});

export type SceneObjectType = (typeof SCENE_OBJECT_TYPES)[number];
export type ScriptFileId = (typeof SCRIPT_FILE_IDS)[number];
export type GameTaskStatus = (typeof GAME_TASK_STATUSES)[number];
export type GameTaskDifficulty = (typeof GAME_TASK_DIFFICULTIES)[number];

export interface SceneObject {
  id: string;
  type: SceneObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  moveSpeed: number;
  collisionEnabled: boolean;
  gravityEnabled: boolean;
}

export interface SceneState {
  objects: SceneObject[];
  gridVisible: boolean;
}

export interface ScriptOverride {
  content: string;
  revision: number;
  lastInstruction: string;
  updatedAt: string;
}

export type ScriptOverrides = Partial<Record<ScriptFileId, ScriptOverride>>;

export interface GameTask {
  id: string;
  title: string;
  status: GameTaskStatus;
  difficulty: GameTaskDifficulty;
  implementationOrder: number;
  relatedScene: typeof MAIN_SCENE_FILE_ID | null;
  relatedScript: ScriptFileId | null;
  completed: boolean;
}

export interface GameProjectWorkspace {
  scene: SceneState;
  scriptOverrides: ScriptOverrides;
  tasks: GameTask[];
}

export class GameProjectWorkspaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameProjectWorkspaceValidationError';
  }
}

const WORKSPACE_KEYS = ['scene', 'scriptOverrides', 'tasks'] as const;
const SCENE_KEYS = ['objects', 'gridVisible'] as const;
const SCENE_OBJECT_KEYS = [
  'id',
  'type',
  'name',
  'x',
  'y',
  'width',
  'height',
  'moveSpeed',
  'collisionEnabled',
  'gravityEnabled',
] as const;
const SCRIPT_OVERRIDE_KEYS = [
  'content',
  'revision',
  'lastInstruction',
  'updatedAt',
] as const;
const TASK_KEYS = [
  'id',
  'title',
  'status',
  'difficulty',
  'implementationOrder',
  'relatedScene',
  'relatedScript',
  'completed',
] as const;

function invalid(path: string, reason: string): never {
  throw new GameProjectWorkspaceValidationError(`${path}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    invalid(path, 'must be an object');
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      invalid(`${path}.${key}`, 'is not a supported field');
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      invalid(`${path}.${key}`, 'is required');
    }
  }
}

function assertSafeId(value: unknown, path: string, maximum: number): string {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    invalid(path, 'must be a non-empty safe ASCII identifier');
  }
  return value;
}

function assertText(
  value: unknown,
  path: string,
  maximum: number,
  allowEmpty = false,
): string {
  if (typeof value !== 'string') {
    invalid(path, 'must be a string');
  }
  if ((!allowEmpty && value.trim().length === 0) || value.length > maximum) {
    invalid(path, allowEmpty ? `must be at most ${maximum} characters` : `must be 1-${maximum} characters`);
  }
  return value;
}

function assertFiniteNumber(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    invalid(path, `must be a finite number between ${minimum} and ${maximum}`);
  }
  return value;
}

function assertInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    invalid(path, `must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function assertBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    invalid(path, 'must be a boolean');
  }
  return value;
}

function assertIsoDateTime(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalid(path, 'must be an ISO datetime string');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    invalid(path, 'must be a normalized ISO datetime string');
  }
  return value;
}

function isOneOf<const T extends readonly string[]>(value: unknown, choices: T): value is T[number] {
  return typeof value === 'string' && choices.some((choice) => choice === value);
}

export function validateGameProjectWorkspaceKey(value: unknown, path = 'projectId'): string {
  return assertSafeId(value, path, GAME_PROJECT_WORKSPACE_LIMITS.maxProjectIdCharacters);
}

export function validateSceneObject(value: unknown, path = 'sceneObject'): SceneObject {
  const candidate = assertRecord(value, path);
  assertExactKeys(candidate, SCENE_OBJECT_KEYS, path);

  if (!isOneOf(candidate.type, SCENE_OBJECT_TYPES)) {
    invalid(`${path}.type`, 'is not a supported scene object type');
  }

  const width = assertFiniteNumber(candidate.width, `${path}.width`, 1, GAME_SCENE_SIZE.width);
  const height = assertFiniteNumber(candidate.height, `${path}.height`, 1, GAME_SCENE_SIZE.height);
  const x = assertFiniteNumber(candidate.x, `${path}.x`, 0, GAME_SCENE_SIZE.width - width);
  const y = assertFiniteNumber(candidate.y, `${path}.y`, 0, GAME_SCENE_SIZE.height - height);

  return {
    id: assertSafeId(
      candidate.id,
      `${path}.id`,
      GAME_PROJECT_WORKSPACE_LIMITS.maxObjectIdCharacters,
    ),
    type: candidate.type,
    name: assertText(
      candidate.name,
      `${path}.name`,
      GAME_PROJECT_WORKSPACE_LIMITS.maxObjectNameCharacters,
    ).trim(),
    x,
    y,
    width,
    height,
    moveSpeed: assertFiniteNumber(
      candidate.moveSpeed,
      `${path}.moveSpeed`,
      0,
      GAME_PROJECT_WORKSPACE_LIMITS.maxMoveSpeed,
    ),
    collisionEnabled: assertBoolean(
      candidate.collisionEnabled,
      `${path}.collisionEnabled`,
    ),
    gravityEnabled: assertBoolean(candidate.gravityEnabled, `${path}.gravityEnabled`),
  };
}

function validateSceneState(value: unknown, path: string): SceneState {
  const candidate = assertRecord(value, path);
  assertExactKeys(candidate, SCENE_KEYS, path);
  if (!Array.isArray(candidate.objects)) {
    invalid(`${path}.objects`, 'must be an array');
  }
  if (candidate.objects.length > GAME_PROJECT_WORKSPACE_LIMITS.maxSceneObjects) {
    invalid(
      `${path}.objects`,
      `must contain at most ${GAME_PROJECT_WORKSPACE_LIMITS.maxSceneObjects} objects`,
    );
  }

  const ids = new Set<string>();
  const objects = candidate.objects.map((object, index) => {
    const validated = validateSceneObject(object, `${path}.objects[${index}]`);
    if (ids.has(validated.id)) {
      invalid(`${path}.objects[${index}].id`, 'must not duplicate another object id');
    }
    ids.add(validated.id);
    return validated;
  });

  return {
    objects,
    gridVisible: assertBoolean(candidate.gridVisible, `${path}.gridVisible`),
  };
}

function validateScriptOverrides(value: unknown, path: string): ScriptOverrides {
  const candidate = assertRecord(value, path);
  const result: ScriptOverrides = {};

  for (const [fileId, overrideValue] of Object.entries(candidate)) {
    if (!isOneOf(fileId, SCRIPT_FILE_IDS)) {
      invalid(`${path}.${fileId}`, 'is not an editable example script');
    }
    const override = assertRecord(overrideValue, `${path}.${fileId}`);
    assertExactKeys(override, SCRIPT_OVERRIDE_KEYS, `${path}.${fileId}`);
    result[fileId] = {
      content: assertText(
        override.content,
        `${path}.${fileId}.content`,
        GAME_PROJECT_WORKSPACE_LIMITS.maxScriptCharacters,
        true,
      ),
      revision: assertInteger(
        override.revision,
        `${path}.${fileId}.revision`,
        1,
        GAME_PROJECT_WORKSPACE_LIMITS.maxScriptRevision,
      ),
      lastInstruction: assertText(
        override.lastInstruction,
        `${path}.${fileId}.lastInstruction`,
        GAME_PROJECT_WORKSPACE_LIMITS.maxInstructionCharacters,
      ).trim(),
      updatedAt: assertIsoDateTime(override.updatedAt, `${path}.${fileId}.updatedAt`),
    };
  }

  return result;
}

function validateGameTask(value: unknown, path: string): GameTask {
  const candidate = assertRecord(value, path);
  assertExactKeys(candidate, TASK_KEYS, path);

  if (!isOneOf(candidate.status, GAME_TASK_STATUSES)) {
    invalid(`${path}.status`, 'is not a supported task status');
  }
  if (!isOneOf(candidate.difficulty, GAME_TASK_DIFFICULTIES)) {
    invalid(`${path}.difficulty`, 'is not a supported task difficulty');
  }
  if (candidate.relatedScene !== null && candidate.relatedScene !== MAIN_SCENE_FILE_ID) {
    invalid(`${path}.relatedScene`, 'must reference MainScene.unity or be null');
  }
  if (candidate.relatedScript !== null && !isOneOf(candidate.relatedScript, SCRIPT_FILE_IDS)) {
    invalid(`${path}.relatedScript`, 'must reference an editable example script or be null');
  }

  return {
    id: assertSafeId(candidate.id, `${path}.id`, GAME_PROJECT_WORKSPACE_LIMITS.maxObjectIdCharacters),
    title: assertText(
      candidate.title,
      `${path}.title`,
      GAME_PROJECT_WORKSPACE_LIMITS.maxTaskTitleCharacters,
    ).trim(),
    status: candidate.status,
    difficulty: candidate.difficulty,
    implementationOrder: assertInteger(
      candidate.implementationOrder,
      `${path}.implementationOrder`,
      1,
      GAME_PROJECT_WORKSPACE_LIMITS.maxTasks,
    ),
    relatedScene: candidate.relatedScene,
    relatedScript: candidate.relatedScript,
    completed: assertBoolean(candidate.completed, `${path}.completed`),
  };
}

function validateTasks(value: unknown, path: string): GameTask[] {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array');
  }
  if (value.length > GAME_PROJECT_WORKSPACE_LIMITS.maxTasks) {
    invalid(path, `must contain at most ${GAME_PROJECT_WORKSPACE_LIMITS.maxTasks} tasks`);
  }

  const ids = new Set<string>();
  const orders = new Set<number>();
  return value.map((task, index) => {
    const validated = validateGameTask(task, `${path}[${index}]`);
    if (ids.has(validated.id)) {
      invalid(`${path}[${index}].id`, 'must not duplicate another task id');
    }
    if (orders.has(validated.implementationOrder)) {
      invalid(`${path}[${index}].implementationOrder`, 'must be unique within the task list');
    }
    ids.add(validated.id);
    orders.add(validated.implementationOrder);
    return validated;
  });
}

export function validateGameProjectWorkspace(
  value: unknown,
  path = 'workspace',
): GameProjectWorkspace {
  const candidate = assertRecord(value, path);
  assertExactKeys(candidate, WORKSPACE_KEYS, path);
  return {
    scene: validateSceneState(candidate.scene, `${path}.scene`),
    scriptOverrides: validateScriptOverrides(
      candidate.scriptOverrides,
      `${path}.scriptOverrides`,
    ),
    tasks: validateTasks(candidate.tasks, `${path}.tasks`),
  };
}

export function createDefaultGameProjectWorkspace(projectId: string): GameProjectWorkspace {
  validateGameProjectWorkspaceKey(projectId);
  return validateGameProjectWorkspace({
    scene: {
      gridVisible: true,
      objects: [
        {
          id: 'player',
          type: 'player',
          name: '플레이어',
          x: 72,
          y: 420,
          width: 44,
          height: 44,
          moveSpeed: 220,
          collisionEnabled: true,
          gravityEnabled: true,
        },
        {
          id: 'enemy',
          type: 'enemy',
          name: '적',
          x: 760,
          y: 420,
          width: 44,
          height: 44,
          moveSpeed: 120,
          collisionEnabled: true,
          gravityEnabled: true,
        },
        {
          id: 'floor',
          type: 'floor',
          name: '바닥',
          x: 0,
          y: 500,
          width: 960,
          height: 40,
          moveSpeed: 0,
          collisionEnabled: true,
          gravityEnabled: false,
        },
        {
          id: 'obstacle',
          type: 'obstacle',
          name: '장애물',
          x: 420,
          y: 420,
          width: 72,
          height: 80,
          moveSpeed: 0,
          collisionEnabled: true,
          gravityEnabled: false,
        },
        {
          id: 'item',
          type: 'item',
          name: '아이템',
          x: 620,
          y: 372,
          width: 28,
          height: 28,
          moveSpeed: 0,
          collisionEnabled: true,
          gravityEnabled: false,
        },
        {
          id: 'camera',
          type: 'camera',
          name: '카메라',
          x: 450,
          y: 250,
          width: 60,
          height: 40,
          moveSpeed: 0,
          collisionEnabled: false,
          gravityEnabled: false,
        },
        {
          id: 'ui',
          type: 'ui',
          name: 'UI',
          x: 24,
          y: 20,
          width: 220,
          height: 44,
          moveSpeed: 0,
          collisionEnabled: false,
          gravityEnabled: false,
        },
      ],
    },
    scriptOverrides: {},
    tasks: [
      {
        id: 'task-scene-layout',
        title: 'MainScene 기본 배치 확인',
        status: 'done',
        difficulty: 'easy',
        implementationOrder: 1,
        relatedScene: MAIN_SCENE_FILE_ID,
        relatedScript: null,
        completed: true,
      },
      {
        id: 'task-player-movement',
        title: '플레이어 이동 연결',
        status: 'in-progress',
        difficulty: 'medium',
        implementationOrder: 2,
        relatedScene: MAIN_SCENE_FILE_ID,
        relatedScript: 'Assets/Scripts/PlayerMovement.cs',
        completed: false,
      },
      {
        id: 'task-collectibles',
        title: '수집 아이템과 점수 연결',
        status: 'todo',
        difficulty: 'medium',
        implementationOrder: 3,
        relatedScene: MAIN_SCENE_FILE_ID,
        relatedScript: 'Assets/Scripts/Collectible.cs',
        completed: false,
      },
      {
        id: 'task-completion',
        title: '전체 수집 완료 조건 확인',
        status: 'todo',
        difficulty: 'hard',
        implementationOrder: 4,
        relatedScene: MAIN_SCENE_FILE_ID,
        relatedScript: 'Assets/Scripts/GameManager.cs',
        completed: false,
      },
    ],
  });
}
