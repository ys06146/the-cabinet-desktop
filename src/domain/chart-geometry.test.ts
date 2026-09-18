import { describe, expect, it } from 'vitest';
import {
  clientXToDataIndex,
  createPriceDomain,
  normalizeViewport,
  panViewport,
  zoomViewport,
} from './chart-geometry';

describe('chart geometry', () => {
  it('clamps pan and zoom to the available series', () => {
    expect(panViewport({ start: 80, count: 20 }, 20, 100)).toEqual({ start: 80, count: 20 });
    expect(panViewport({ start: 0, count: 20 }, -20, 100)).toEqual({ start: 0, count: 20 });

    const zoomed = zoomViewport({ start: 20, count: 60 }, 0.5, 100, 50);
    expect(zoomed.count).toBe(30);
    expect(zoomed.start).toBeGreaterThanOrEqual(0);
    expect(zoomed.start + zoomed.count).toBeLessThanOrEqual(100);
  });

  it('enforces a minimum viewport and maps pointer edges', () => {
    expect(normalizeViewport({ start: 99, count: 1 }, 100)).toEqual({ start: 88, count: 12 });
    expect(clientXToDataIndex(10, 10, 100, { start: 20, count: 20 })).toBe(20);
    expect(clientXToDataIndex(110, 10, 100, { start: 20, count: 20 })).toBe(39);
  });

  it('creates a usable price domain for flat candles', () => {
    const domain = createPriceDomain([
      { timestamp: 1, open: 100, high: 100, low: 100, close: 100, volume: 0 },
    ]);
    expect(domain.min).toBeLessThan(100);
    expect(domain.max).toBeGreaterThan(100);
  });
});

