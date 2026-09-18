import { describe, expect, it } from 'vitest';
import {
  GAME_ATELIER_MIGRATIONS,
  GameAtelierDataError,
  createEmptyGameAtelierData,
  migrateGameAtelierData,
  parseGameAtelierData,
  serializeGameAtelierData,
  upsertGameProject,
  upsertGameProjectWorkspace,
  validateGameAtelierData,
} from './game-atelier-data';
import { createDefaultGameProjectWorkspace } from './game-project-workspace';
import { MIDNIGHT_ARCHIVE_PROJECT } from '../providers/mock/game-project-fixtures';

describe('Game Atelier persisted data', () => {
  it('round-trips current data and preserves a pinned dataVersion', () => {
    const data = upsertGameProject(createEmptyGameAtelierData(), MIDNIGHT_ARCHIVE_PROJECT);

    expect(parseGameAtelierData(serializeGameAtelierData(data))).toEqual(data);
    expect(data.dataVersion).toBe(2);
  });

  it('rejects unknown root keys, duplicate ids, and dangling last-opened references', () => {
    const project = MIDNIGHT_ARCHIVE_PROJECT;

    expect(() =>
      validateGameAtelierData({
        dataVersion: 2,
        projects: [],
        projectWorkspaces: {},
        lastOpenedProjectId: null,
        token: 'must-not-be-stored',
      }),
    ).toThrow(GameAtelierDataError);
    expect(() =>
      validateGameAtelierData({
        dataVersion: 2,
        projects: [project, project],
        projectWorkspaces: {},
        lastOpenedProjectId: project.id,
      }),
    ).toThrow(GameAtelierDataError);
    expect(() =>
      validateGameAtelierData({
        dataVersion: 2,
        projects: [],
        projectWorkspaces: {},
        lastOpenedProjectId: 'missing-project',
      }),
    ).toThrow(GameAtelierDataError);
  });

  it('migrates v1 projects into v2 without changing the GameProject schema', () => {
    expect(Object.isFrozen(GAME_ATELIER_MIGRATIONS)).toBe(true);
    expect(
      migrateGameAtelierData({
        dataVersion: 1,
        projects: [MIDNIGHT_ARCHIVE_PROJECT],
        lastOpenedProjectId: MIDNIGHT_ARCHIVE_PROJECT.id,
      }),
    ).toEqual({
      dataVersion: 2,
      projects: [MIDNIGHT_ARCHIVE_PROJECT],
      projectWorkspaces: {},
      lastOpenedProjectId: MIDNIGHT_ARCHIVE_PROJECT.id,
    });
    expect(() =>
      migrateGameAtelierData({ dataVersion: 0, projects: [], lastOpenedProjectId: null }),
    ).toThrowError(/No migration is available/);
  });

  it('round-trips a workspace independently from the project schema', () => {
    const workspace = createDefaultGameProjectWorkspace(MIDNIGHT_ARCHIVE_PROJECT.id);
    const data = upsertGameProjectWorkspace(
      createEmptyGameAtelierData(),
      MIDNIGHT_ARCHIVE_PROJECT.id,
      workspace,
    );

    expect(parseGameAtelierData(serializeGameAtelierData(data))).toEqual(data);
    expect(data.projectWorkspaces[MIDNIGHT_ARCHIVE_PROJECT.id]).toEqual(workspace);
  });

  it('rejects malformed JSON before it reaches the store', () => {
    expect(() => parseGameAtelierData('{broken')).toThrowError(
      expect.objectContaining({ code: 'INVALID_JSON' }),
    );
  });
});
