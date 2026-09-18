import { app, type BrowserWindow, type Rectangle } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from './logger';

export const WINDOW_DEFAULTS = {
  width: 1440,
  height: 900,
  minWidth: 1100,
  minHeight: 700,
} as const;

export interface WindowPlacement {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

interface StoredWindowState extends Rectangle {
  isMaximized: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStoredWindowState(value: unknown): value is StoredWindowState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredWindowState>;
  return (
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.width) &&
    isFiniteNumber(candidate.height) &&
    typeof candidate.isMaximized === 'boolean'
  );
}

function intersectionArea(first: Rectangle, second: Rectangle): number {
  const width = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
  );
  const height = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y),
  );
  return width * height;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getWindowMinimumSize(workArea: Rectangle): {
  width: number;
  height: number;
} {
  return {
    width: Math.min(WINDOW_DEFAULTS.minWidth, Math.max(1, Math.round(workArea.width))),
    height: Math.min(
      WINDOW_DEFAULTS.minHeight,
      Math.max(1, Math.round(workArea.height)),
    ),
  };
}

function getDefaultPlacement(workArea?: Rectangle): WindowPlacement {
  if (!workArea) {
    return { width: WINDOW_DEFAULTS.width, height: WINDOW_DEFAULTS.height };
  }
  return {
    width: Math.min(WINDOW_DEFAULTS.width, Math.max(1, Math.round(workArea.width))),
    height: Math.min(
      WINDOW_DEFAULTS.height,
      Math.max(1, Math.round(workArea.height)),
    ),
  };
}

export function normalizeWindowState(
  storedState: unknown,
  workAreas: Rectangle[],
): WindowPlacement {
  if (workAreas.length === 0) {
    return getDefaultPlacement();
  }
  if (!isStoredWindowState(storedState)) {
    return getDefaultPlacement(workAreas[0]);
  }

  const targetArea = workAreas
    .map((area) => ({ area, overlap: intersectionArea(storedState, area) }))
    .sort((first, second) => second.overlap - first.overlap)[0];

  if (!targetArea || targetArea.overlap === 0) {
    return getDefaultPlacement(workAreas[0]);
  }

  const { area } = targetArea;
  const areaWidth = Math.max(1, Math.round(area.width));
  const areaHeight = Math.max(1, Math.round(area.height));
  const minimum = getWindowMinimumSize(area);
  const width = clamp(
    Math.round(storedState.width),
    minimum.width,
    areaWidth,
  );
  const height = clamp(
    Math.round(storedState.height),
    minimum.height,
    areaHeight,
  );
  const maxX = Math.max(area.x, area.x + area.width - width);
  const maxY = Math.max(area.y, area.y + area.height - height);

  return {
    x: clamp(Math.round(storedState.x), area.x, maxX),
    y: clamp(Math.round(storedState.y), area.y, maxY),
    width,
    height,
    isMaximized: storedState.isMaximized,
  };
}

export class WindowStateStore {
  private readonly filePath = join(app.getPath('userData'), 'window-state.json');
  private saveTimer?: NodeJS.Timeout;

  load(workAreas: Rectangle[]): WindowPlacement {
    if (!existsSync(this.filePath)) {
      return normalizeWindowState(undefined, workAreas);
    }

    try {
      const storedState: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'));
      return normalizeWindowState(storedState, workAreas);
    } catch (error) {
      logger.warn('Unable to restore the saved window state', error);
      return normalizeWindowState(undefined, workAreas);
    }
  }

  track(window: BrowserWindow): void {
    const scheduleSave = (): void => {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }

      this.saveTimer = setTimeout(() => this.save(window), 250);
    };

    window.on('resize', scheduleSave);
    window.on('move', scheduleSave);
    window.on('maximize', scheduleSave);
    window.on('unmaximize', scheduleSave);
    window.on('close', () => {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
      this.save(window);
    });
  }

  private save(window: BrowserWindow): void {
    if (window.isDestroyed()) {
      return;
    }

    const state: StoredWindowState = {
      ...window.getNormalBounds(),
      isMaximized: window.isMaximized(),
    };

    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      logger.error('Unable to persist the window state', error);
    }
  }
}
