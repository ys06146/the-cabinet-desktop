import {
  GameProjectValidationError,
  validateGameProject,
  type GameProject,
} from './game-project';
import {
  GameProjectWorkspaceValidationError,
  validateGameProjectWorkspace,
  validateGameProjectWorkspaceKey,
  type GameProjectWorkspace,
} from './game-project-workspace';

export const GAME_ATELIER_DATA_VERSION = 2 as const;

export const GAME_ATELIER_DATA_LIMITS = Object.freeze({
  maxProjects: 100,
  maxProjectWorkspaces: 101,
  maxSerializedCharacters: 4_000_000,
  maxSerializedBytes: 16_000_000,
});

export interface GameAtelierDataV1 {
  dataVersion: 1;
  projects: GameProject[];
  lastOpenedProjectId: string | null;
}

export interface GameAtelierDataV2 {
  dataVersion: 2;
  projects: GameProject[];
  projectWorkspaces: Record<string, GameProjectWorkspace>;
  lastOpenedProjectId: string | null;
}

export type GameAtelierData = GameAtelierDataV2;

export type GameAtelierDataErrorCode =
  | 'DATA_TOO_LARGE'
  | 'INVALID_DATA'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_VERSION';

export class GameAtelierDataError extends Error {
  constructor(
    public readonly code: GameAtelierDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GameAtelierDataError';
  }
}

type GameAtelierMigrator = (value: unknown) => unknown;

function invalid(path: string, reason: string): never {
  throw new GameAtelierDataError('INVALID_DATA', `${path}: ${reason}`);
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
  allowedKeys: readonly string[],
  path: string,
): void {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      invalid(`${path}.${key}`, 'is not a supported field');
    }
  }

  for (const key of allowedKeys) {
    if (!Object.hasOwn(value, key)) {
      invalid(`${path}.${key}`, 'is required');
    }
  }
}

function readDataVersion(value: unknown): number {
  const candidate = assertRecord(value, 'data');
  const version = candidate.dataVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    invalid('data.dataVersion', 'must be a non-negative integer');
  }
  return version;
}

function validateProjects(value: unknown, path: string): {
  projects: GameProject[];
  projectIds: Set<string>;
} {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array');
  }
  if (value.length > GAME_ATELIER_DATA_LIMITS.maxProjects) {
    invalid(path, `must contain at most ${GAME_ATELIER_DATA_LIMITS.maxProjects} projects`);
  }

  const projectIds = new Set<string>();
  const projects = value.map((project, index) => {
    let validated: GameProject;
    try {
      validated = validateGameProject(project);
    } catch (error) {
      if (error instanceof GameProjectValidationError) {
        invalid(`${path}[${index}]`, error.message);
      }
      throw error;
    }
    if (projectIds.has(validated.id)) {
      invalid(`${path}[${index}].id`, 'must not duplicate another project id');
    }
    projectIds.add(validated.id);
    return validated;
  });

  return { projects, projectIds };
}

function validateLastOpenedProjectId(value: unknown, projectIds: Set<string>): string | null {
  if (value !== null && typeof value !== 'string') {
    invalid('data.lastOpenedProjectId', 'must be null or a project id');
  }
  if (value !== null && !projectIds.has(value)) {
    invalid('data.lastOpenedProjectId', 'must reference a stored project');
  }
  return value;
}

function validateLegacyV1(value: unknown): GameAtelierDataV1 {
  const candidate = assertRecord(value, 'data');
  assertExactKeys(candidate, ['dataVersion', 'projects', 'lastOpenedProjectId'], 'data');
  if (candidate.dataVersion !== 1) {
    invalid('data.dataVersion', 'must be 1');
  }

  const { projects, projectIds } = validateProjects(candidate.projects, 'data.projects');
  return {
    dataVersion: 1,
    projects,
    lastOpenedProjectId: validateLastOpenedProjectId(
      candidate.lastOpenedProjectId,
      projectIds,
    ),
  };
}

function validateProjectWorkspaces(
  value: unknown,
  path: string,
): Record<string, GameProjectWorkspace> {
  const candidate = assertRecord(value, path);
  const entries = Object.entries(candidate);
  if (entries.length > GAME_ATELIER_DATA_LIMITS.maxProjectWorkspaces) {
    invalid(
      path,
      `must contain at most ${GAME_ATELIER_DATA_LIMITS.maxProjectWorkspaces} workspaces`,
    );
  }

  const projectWorkspaces: Record<string, GameProjectWorkspace> = {};
  for (const [projectId, workspace] of entries) {
    try {
      const validatedProjectId = validateGameProjectWorkspaceKey(
        projectId,
        `${path}.${projectId}`,
      );
      projectWorkspaces[validatedProjectId] = validateGameProjectWorkspace(
        workspace,
        `${path}.${projectId}`,
      );
    } catch (error) {
      if (error instanceof GameProjectWorkspaceValidationError) {
        invalid(path, error.message);
      }
      throw error;
    }
  }
  return projectWorkspaces;
}

function migrateV1ToV2(value: unknown): GameAtelierDataV2 {
  const legacy = validateLegacyV1(value);
  return {
    dataVersion: 2,
    projects: legacy.projects,
    projectWorkspaces: {},
    lastOpenedProjectId: legacy.lastOpenedProjectId,
  };
}

export function createEmptyGameAtelierData(): GameAtelierDataV2 {
  return {
    dataVersion: GAME_ATELIER_DATA_VERSION,
    projects: [],
    projectWorkspaces: {},
    lastOpenedProjectId: null,
  };
}

export function validateGameAtelierData(value: unknown): GameAtelierDataV2 {
  const candidate = assertRecord(value, 'data');
  assertExactKeys(
    candidate,
    ['dataVersion', 'projects', 'projectWorkspaces', 'lastOpenedProjectId'],
    'data',
  );

  if (candidate.dataVersion !== GAME_ATELIER_DATA_VERSION) {
    throw new GameAtelierDataError(
      'UNSUPPORTED_VERSION',
      `Unsupported Game Atelier data version: ${String(candidate.dataVersion)}`,
    );
  }

  const { projects, projectIds } = validateProjects(candidate.projects, 'data.projects');
  return {
    dataVersion: GAME_ATELIER_DATA_VERSION,
    projects,
    projectWorkspaces: validateProjectWorkspaces(
      candidate.projectWorkspaces,
      'data.projectWorkspaces',
    ),
    lastOpenedProjectId: validateLastOpenedProjectId(
      candidate.lastOpenedProjectId,
      projectIds,
    ),
  };
}

export const GAME_ATELIER_MIGRATIONS: Readonly<Partial<Record<number, GameAtelierMigrator>>> =
  Object.freeze({
    1: migrateV1ToV2,
  });

export function migrateGameAtelierData(value: unknown): GameAtelierDataV2 {
  let migrated = value;
  let version = readDataVersion(migrated);

  if (version > GAME_ATELIER_DATA_VERSION) {
    throw new GameAtelierDataError(
      'UNSUPPORTED_VERSION',
      `Data version ${version} is newer than supported version ${GAME_ATELIER_DATA_VERSION}`,
    );
  }

  while (version < GAME_ATELIER_DATA_VERSION) {
    const migrator = GAME_ATELIER_MIGRATIONS[version];
    if (!migrator) {
      throw new GameAtelierDataError(
        'UNSUPPORTED_VERSION',
        `No migration is available from data version ${version}`,
      );
    }
    migrated = migrator(migrated);
    const nextVersion = readDataVersion(migrated);
    if (nextVersion !== version + 1) {
      invalid('data.dataVersion', 'migration must advance exactly one data version');
    }
    version = nextVersion;
  }

  return validateGameAtelierData(migrated);
}

export function parseGameAtelierData(serialized: string): GameAtelierDataV2 {
  if (typeof serialized !== 'string') {
    invalid('data', 'must be JSON text');
  }
  if (serialized.length > GAME_ATELIER_DATA_LIMITS.maxSerializedCharacters) {
    throw new GameAtelierDataError(
      'DATA_TOO_LARGE',
      `Data exceeds ${GAME_ATELIER_DATA_LIMITS.maxSerializedCharacters} characters`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new GameAtelierDataError('INVALID_JSON', 'Stored Game Atelier data is not valid JSON');
  }
  return migrateGameAtelierData(parsed);
}

export function serializeGameAtelierData(value: unknown): string {
  const serialized = `${JSON.stringify(validateGameAtelierData(value), null, 2)}\n`;
  if (
    serialized.length > GAME_ATELIER_DATA_LIMITS.maxSerializedCharacters ||
    new TextEncoder().encode(serialized).byteLength > GAME_ATELIER_DATA_LIMITS.maxSerializedBytes
  ) {
    throw new GameAtelierDataError('DATA_TOO_LARGE', 'Stored Game Atelier data is too large');
  }
  return serialized;
}

export function upsertGameProject(
  data: unknown,
  project: unknown,
): GameAtelierDataV2 {
  const current = validateGameAtelierData(data);
  const validatedProject = validateGameProject(project);
  const projectIndex = current.projects.findIndex(({ id }) => id === validatedProject.id);
  const projects = [...current.projects];

  if (projectIndex === -1) {
    projects.push(validatedProject);
  } else {
    projects[projectIndex] = validatedProject;
  }

  return validateGameAtelierData({
    ...current,
    projects,
    lastOpenedProjectId: validatedProject.id,
  });
}

export function upsertGameProjectWorkspace(
  data: unknown,
  projectId: unknown,
  workspace: unknown,
): GameAtelierDataV2 {
  const current = validateGameAtelierData(data);
  let validatedProjectId: string;
  let validatedWorkspace: GameProjectWorkspace;
  try {
    validatedProjectId = validateGameProjectWorkspaceKey(projectId);
    validatedWorkspace = validateGameProjectWorkspace(workspace);
  } catch (error) {
    if (error instanceof GameProjectWorkspaceValidationError) {
      invalid('workspace', error.message);
    }
    throw error;
  }

  return validateGameAtelierData({
    ...current,
    projectWorkspaces: {
      ...current.projectWorkspaces,
      [validatedProjectId]: validatedWorkspace,
    },
  });
}