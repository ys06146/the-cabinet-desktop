import { describe, expect, it } from 'vitest';
import {
  GAME_SCENE_SIZE,
  GameProjectWorkspaceValidationError,
  createDefaultGameProjectWorkspace,
  validateGameProjectWorkspace,
  validateSceneObject,
} from './game-project-workspace';

describe('Game Project workspace', () => {
  it('creates a fresh valid editor state with every required scene object type', () => {
    const first = createDefaultGameProjectWorkspace('midnight-archive');
    const second = createDefaultGameProjectWorkspace('midnight-archive');

    expect(first.scene.objects.map(({ type }) => type)).toEqual([
      'player',
      'enemy',
      'floor',
      'obstacle',
      'item',
      'camera',
      'ui',
    ]);
    expect(first.tasks.map(({ implementationOrder }) => implementationOrder)).toEqual([1, 2, 3, 4]);
    expect(first).not.toBe(second);
    expect(first.scene.objects).not.toBe(second.scene.objects);
  });

  it('keeps every object inside the logical 960 by 540 scene', () => {
    const workspace = createDefaultGameProjectWorkspace('example-project');

    for (const object of workspace.scene.objects) {
      expect(object.x).toBeGreaterThanOrEqual(0);
      expect(object.y).toBeGreaterThanOrEqual(0);
      expect(object.x + object.width).toBeLessThanOrEqual(GAME_SCENE_SIZE.width);
      expect(object.y + object.height).toBeLessThanOrEqual(GAME_SCENE_SIZE.height);
    }
  });

  it('rejects objects extending outside the scene or carrying unknown fields', () => {
    const object = createDefaultGameProjectWorkspace('example-project').scene.objects[0];

    expect(() => validateSceneObject({ ...object, x: GAME_SCENE_SIZE.width })).toThrow(
      GameProjectWorkspaceValidationError,
    );
    expect(() => validateSceneObject({ ...object, html: '<script>' })).toThrow(
      GameProjectWorkspaceValidationError,
    );
  });

  it('rejects unknown script paths and duplicate task ordering', () => {
    const workspace = createDefaultGameProjectWorkspace('example-project');

    expect(() =>
      validateGameProjectWorkspace({
        ...workspace,
        scriptOverrides: {
          'Assets/Scripts/RemotePayload.cs': {
            content: 'bad',
            revision: 1,
            lastInstruction: 'bad',
            updatedAt: '2026-07-30T00:00:00.000Z',
          },
        },
      }),
    ).toThrowError(/not an editable example script/);

    expect(() =>
      validateGameProjectWorkspace({
        ...workspace,
        tasks: workspace.tasks.map((task) => ({ ...task, implementationOrder: 1 })),
      }),
    ).toThrowError(/must be unique/);
  });

  it('accepts a strict override only for a known example script', () => {
    const workspace = createDefaultGameProjectWorkspace('example-project');
    const validated = validateGameProjectWorkspace({
      ...workspace,
      scriptOverrides: {
        'Assets/Scripts/PlayerMovement.cs': {
          content: 'public float moveSpeed = 8f;',
          revision: 1,
          lastInstruction: '캐릭터를 빠르게 해줘',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
      },
    });

    expect(validated.scriptOverrides['Assets/Scripts/PlayerMovement.cs']?.revision).toBe(1);
  });
});
