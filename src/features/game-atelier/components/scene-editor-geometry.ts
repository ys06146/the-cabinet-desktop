import {
  GAME_SCENE_SIZE,
  type SceneObject,
  type SceneState,
} from '../../../domain/game-project-workspace';

export const SCENE_WIDTH = GAME_SCENE_SIZE.width;
export const SCENE_HEIGHT = GAME_SCENE_SIZE.height;
export const MIN_SCENE_OBJECT_SIZE = 12;

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneBounds {
  height: number;
  width: number;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function clampSceneObject(object: SceneObject): SceneObject {
  const width = clamp(
    Math.round(object.width),
    MIN_SCENE_OBJECT_SIZE,
    SCENE_WIDTH,
  );
  const height = clamp(
    Math.round(object.height),
    MIN_SCENE_OBJECT_SIZE,
    SCENE_HEIGHT,
  );

  return {
    ...object,
    height,
    width,
    x: clamp(Math.round(object.x), 0, SCENE_WIDTH - width),
    y: clamp(Math.round(object.y), 0, SCENE_HEIGHT - height),
  };
}

export function moveSceneObject(
  object: SceneObject,
  delta: ScenePoint,
): SceneObject {
  return clampSceneObject({
    ...object,
    x: object.x + delta.x,
    y: object.y + delta.y,
  });
}

export function resizeSceneObject(
  object: SceneObject,
  delta: ScenePoint,
): SceneObject {
  return {
    ...object,
    width: clamp(
      Math.round(object.width + delta.x),
      MIN_SCENE_OBJECT_SIZE,
      SCENE_WIDTH - object.x,
    ),
    height: clamp(
      Math.round(object.height + delta.y),
      MIN_SCENE_OBJECT_SIZE,
      SCENE_HEIGHT - object.y,
    ),
  };
}

export function containsScenePoint(
  object: SceneObject,
  point: ScenePoint,
): boolean {
  return (
    point.x >= object.x &&
    point.x <= object.x + object.width &&
    point.y >= object.y &&
    point.y <= object.y + object.height
  );
}

export function findTopmostSceneObject(
  objects: readonly SceneObject[],
  point: ScenePoint,
): SceneObject | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];
    if (object && containsScenePoint(object, point)) {
      return object;
    }
  }

  return null;
}

export function replaceSceneObject(
  scene: SceneState,
  nextObject: SceneObject,
): SceneState {
  return {
    ...scene,
    objects: scene.objects.map((object) =>
      object.id === nextObject.id ? clampSceneObject(nextObject) : object,
    ),
  };
}

export function removeSceneObject(scene: SceneState, objectId: string): SceneState {
  return {
    ...scene,
    objects: scene.objects.filter((object) => object.id !== objectId),
  };
}

export function clientPointToScenePoint(
  clientPoint: ScenePoint,
  bounds: SceneBounds & { left: number; top: number },
): ScenePoint {
  return {
    x: clamp(
      ((clientPoint.x - bounds.left) / Math.max(1, bounds.width)) * SCENE_WIDTH,
      0,
      SCENE_WIDTH,
    ),
    y: clamp(
      ((clientPoint.y - bounds.top) / Math.max(1, bounds.height)) * SCENE_HEIGHT,
      0,
      SCENE_HEIGHT,
    ),
  };
}
