import { describe, expect, it } from 'vitest';
import type { SceneObject, SceneState } from '../../../domain/game-project-workspace';
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  clientPointToScenePoint,
  findTopmostSceneObject,
  moveSceneObject,
  removeSceneObject,
  resizeSceneObject,
} from './scene-editor-geometry';

const player: SceneObject = {
  collisionEnabled: true,
  gravityEnabled: false,
  height: 48,
  id: 'player',
  moveSpeed: 5,
  name: '플레이어',
  type: 'player',
  width: 48,
  x: 100,
  y: 100,
};

describe('scene editor geometry', () => {
  it('maps pointer coordinates into a stable 960 by 540 logical scene', () => {
    expect(
      clientPointToScenePoint(
        { x: 500, y: 290 },
        { height: 540, left: 20, top: 20, width: 960 },
      ),
    ).toEqual({ x: 480, y: 270 });
  });

  it('clamps moved objects inside the scene', () => {
    expect(moveSceneObject(player, { x: 900, y: 500 })).toMatchObject({
      x: SCENE_WIDTH - player.width,
      y: SCENE_HEIGHT - player.height,
    });
    expect(moveSceneObject(player, { x: -500, y: -500 })).toMatchObject({ x: 0, y: 0 });
  });

  it('resizes from the lower-right edge without leaving the scene', () => {
    expect(resizeSceneObject(player, { x: -100, y: -100 })).toMatchObject({
      height: 12,
      width: 12,
    });
    expect(resizeSceneObject({ ...player, x: 900, y: 500 }, { x: 1_000, y: 1_000 })).toMatchObject({
      height: SCENE_HEIGHT - 500,
      width: SCENE_WIDTH - 900,
      x: 900,
      y: 500,
    });
  });

  it('selects the visually topmost overlapping object', () => {
    const item = { ...player, id: 'item', name: '아이템', type: 'item' as const };
    expect(findTopmostSceneObject([player, item], { x: 120, y: 120 })?.id).toBe('item');
    expect(findTopmostSceneObject([player], { x: 10, y: 10 })).toBeNull();
  });

  it('removes only the requested scene object', () => {
    const scene: SceneState = {
      gridVisible: true,
      objects: [player, { ...player, id: 'floor', name: '바닥', type: 'floor' }],
    };

    expect(removeSceneObject(scene, 'player').objects.map((object) => object.id)).toEqual(['floor']);
  });
});
