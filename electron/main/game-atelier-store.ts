import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  GAME_ATELIER_DATA_LIMITS,
  GameAtelierDataError,
  createEmptyGameAtelierData,
  parseGameAtelierData,
  serializeGameAtelierData,
  upsertGameProject,
  upsertGameProjectWorkspace,
  validateGameAtelierData,
  type GameAtelierDataV2,
} from '../../src/domain/game-atelier-data';
import type { GameProject } from '../../src/domain/game-project';
import {
  validateGameProjectWorkspaceKey,
  type GameProjectWorkspace,
} from '../../src/domain/game-project-workspace';

export const GAME_ATELIER_FILE_NAME = 'game-atelier-data.json';

export interface GameAtelierStoreOptions {
  userDataPath: string;
}

function resolveStoragePath(userDataPath: string): string {
  if (typeof userDataPath !== 'string' || userDataPath.trim().length === 0) {
    throw new TypeError('A non-empty Electron userData path is required');
  }
  if (!isAbsolute(userDataPath)) {
    throw new TypeError('The Electron userData path must be absolute');
  }
  return join(resolve(userDataPath), GAME_ATELIER_FILE_NAME);
}

function writeAtomically(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;

  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(descriptor, contents, { encoding: 'utf8' });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, filePath);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original write failure.
      }
    }
    try {
      unlinkSync(temporaryPath);
    } catch {
      // The temporary file may not exist or may already have been renamed.
    }
    throw error;
  }
}

export class GameAtelierStore {
  readonly storagePath: string;

  constructor(options: GameAtelierStoreOptions) {
    this.storagePath = resolveStoragePath(options.userDataPath);
  }

  load(): GameAtelierDataV2 {
    if (!existsSync(this.storagePath)) {
      return createEmptyGameAtelierData();
    }
    if (statSync(this.storagePath).size > GAME_ATELIER_DATA_LIMITS.maxSerializedBytes) {
      throw new GameAtelierDataError('DATA_TOO_LARGE', 'Stored Game Atelier data is too large');
    }
    return parseGameAtelierData(readFileSync(this.storagePath, 'utf8'));
  }

  save(data: unknown): GameAtelierDataV2 {
    const validated = validateGameAtelierData(data);
    writeAtomically(this.storagePath, serializeGameAtelierData(validated));
    return validated;
  }

  getWorkspace(projectId: string): GameProjectWorkspace | null {
    const validatedProjectId = validateGameProjectWorkspaceKey(projectId);
    return this.load().projectWorkspaces[validatedProjectId] ?? null;
  }

  saveProject(project: GameProject): GameAtelierDataV2 {
    return this.save(upsertGameProject(this.load(), project));
  }

  saveWorkspace(projectId: string, workspace: GameProjectWorkspace): GameAtelierDataV2 {
    return this.save(upsertGameProjectWorkspace(this.load(), projectId, workspace));
  }
}
