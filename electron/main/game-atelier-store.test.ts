import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GameAtelierDataError,
  createEmptyGameAtelierData,
} from '../../src/domain/game-atelier-data';
import {
  type GameProject,
} from '../../src/domain/game-project';
import { createDefaultGameProjectWorkspace } from '../../src/domain/game-project-workspace';
import { MIDNIGHT_ARCHIVE_PROJECT } from '../../src/providers/mock/game-project-fixtures';
import { GAME_ATELIER_FILE_NAME, GameAtelierStore } from './game-atelier-store';

const temporaryDirectories: string[] = [];

function createUserDataDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'the-cabinet-game-atelier-'));
  temporaryDirectories.push(directory);
  return directory;
}

function createUserProject(id = 'rainwalk-seoul'): GameProject {
  return {
    ...MIDNIGHT_ARCHIVE_PROJECT,
    id,
    initialIdea: '비 오는 서울을 걷는 짧은 감성 게임',
    overview: {
      ...MIDNIGHT_ARCHIVE_PROJECT.overview,
      title: 'Rainwalk Seoul',
      oneLineDescription: '빗속의 서울을 걸으며 흩어진 기억을 모으는 짧은 감성 게임.',
    },
    createdAt: '2026-07-30T09:00:00.000Z',
    updatedAt: '2026-07-30T09:00:00.000Z',
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('GameAtelierStore', () => {
  it('starts empty without duplicating the bundled Midnight Archive fixture', () => {
    const store = new GameAtelierStore({ userDataPath: createUserDataDirectory() });

    expect(store.load()).toEqual(createEmptyGameAtelierData());
  });

  it('restores a saved project through a new Store instance after a simulated relaunch', () => {
    const userDataPath = createUserDataDirectory();
    const project = createUserProject();
    const firstSession = new GameAtelierStore({ userDataPath });
    firstSession.saveProject(project);

    const relaunchedSession = new GameAtelierStore({ userDataPath });
    expect(relaunchedSession.load()).toEqual({
      dataVersion: 2,
      projects: [project],
      projectWorkspaces: {},
      lastOpenedProjectId: project.id,
    });
    expect(JSON.parse(readFileSync(join(userDataPath, GAME_ATELIER_FILE_NAME), 'utf8'))).toEqual(
      relaunchedSession.load(),
    );
    expect(readdirSync(userDataPath)).toEqual([GAME_ATELIER_FILE_NAME]);
  });

  it('loads a v1 file after an app update without losing its project', () => {
    const userDataPath = createUserDataDirectory();
    const project = createUserProject();
    writeFileSync(
      join(userDataPath, GAME_ATELIER_FILE_NAME),
      JSON.stringify({
        dataVersion: 1,
        projects: [project],
        lastOpenedProjectId: project.id,
      }),
      'utf8',
    );

    expect(new GameAtelierStore({ userDataPath }).load()).toEqual({
      dataVersion: 2,
      projects: [project],
      projectWorkspaces: {},
      lastOpenedProjectId: project.id,
    });
  });

  it('upserts an existing id and records it as the last opened project', () => {
    const store = new GameAtelierStore({ userDataPath: createUserDataDirectory() });
    const project = createUserProject();
    store.saveProject(project);

    const updated = store.saveProject({
      ...project,
      overview: { ...project.overview, nextTask: '서울역 구간의 걷기 루프를 검증한다.' },
      updatedAt: '2026-07-30T10:00:00.000Z',
    });

    expect(updated.projects).toHaveLength(1);
    expect(updated.projects[0]?.overview.nextTask).toBe('서울역 구간의 걷기 루프를 검증한다.');
    expect(updated.lastOpenedProjectId).toBe(project.id);
  });

  it('rejects invalid data without replacing a previously persisted project', () => {
    const store = new GameAtelierStore({ userDataPath: createUserDataDirectory() });
    const before = store.saveProject(createUserProject());

    expect(() =>
      store.save({
        ...before,
        projects: [{ ...before.projects[0], source: 'remote-ai' }],
      }),
    ).toThrow();
    expect(store.load()).toEqual(before);
  });

  it('restores workspace edits through a new Store instance after a simulated relaunch', () => {
    const userDataPath = createUserDataDirectory();
    const workspace = createDefaultGameProjectWorkspace('midnight-archive');
    workspace.scene.objects[0] = {
      ...workspace.scene.objects[0],
      moveSpeed: 320,
    };

    new GameAtelierStore({ userDataPath }).saveWorkspace('midnight-archive', workspace);

    const relaunched = new GameAtelierStore({ userDataPath });
    const restored = relaunched.load();
    expect(restored.projectWorkspaces['midnight-archive']).toEqual(workspace);
    expect(relaunched.getWorkspace('midnight-archive')).toEqual(workspace);
    expect(relaunched.getWorkspace('not-saved')).toBeNull();
  });

  it('rejects unsupported versions through the migration boundary', () => {
    const userDataPath = createUserDataDirectory();
    const store = new GameAtelierStore({ userDataPath });

    expect(() =>
      store.save({ dataVersion: 3, projects: [], projectWorkspaces: {}, lastOpenedProjectId: null }),
    ).toThrow(GameAtelierDataError);
  });

  it('requires Electron userData to be an absolute path', () => {
    expect(() => new GameAtelierStore({ userDataPath: 'relative-user-data' })).toThrow(TypeError);
  });
});
