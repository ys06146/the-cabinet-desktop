import { mapValueToY, type ChartViewport, type NumericDomain } from '../../../domain/chart-geometry';
import type { IndicatorValue } from '../../../domain/market-indicators';

export const CHART_WIDTH = 1000;
export const CHART_HEIGHT = 540;
export const PLOT_LEFT = 18;
export const PLOT_RIGHT = 910;
export const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
export const PRICE_TOP = 24;
export const PRICE_HEIGHT = 304;
export const VOLUME_TOP = 350;
export const VOLUME_HEIGHT = 70;
export const MACD_TOP = 454;
export const MACD_HEIGHT = 58;

export function createPriceLinePath(
  series: readonly IndicatorValue[],
  viewport: ChartViewport,
  domain: NumericDomain,
): string {
  return createLinePath(series, viewport, (value) =>
    mapValueToY(value, domain, PRICE_TOP, PRICE_HEIGHT),
  );
}

export function createIndicatorLinePath(
  series: readonly IndicatorValue[],
  viewport: ChartViewport,
  mapY: (value: number) => number,
): string {
  return createLinePath(series, viewport, mapY);
}

function createLinePath(
  series: readonly IndicatorValue[],
  viewport: ChartViewport,
  mapY: (value: number) => number,
): string {
  const slot = PLOT_WIDTH / Math.max(1, viewport.count);
  let path = '';
  let drawing = false;
  for (let localIndex = 0; localIndex < viewport.count; localIndex += 1) {
    const value = series[viewport.start + localIndex];
    if (value === null || value === undefined) {
      drawing = false;
      continue;
    }
    const x = PLOT_LEFT + (localIndex + 0.5) * slot;
    path += `${drawing ? ' L' : 'M'} ${x.toFixed(2)} ${mapY(value).toFixed(2)}`;
    drawing = true;
  }
  return path;
}

export function indicatorLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(2);
}

