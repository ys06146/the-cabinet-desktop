import type { OHLCV } from './market';

export interface ChartViewport {
  start: number;
  count: number;
}

export interface NumericDomain {
  min: number;
  max: number;
}

export function createFullViewport(dataLength: number): ChartViewport {
  return { start: 0, count: Math.max(0, dataLength) };
}

export function normalizeViewport(
  viewport: ChartViewport,
  dataLength: number,
  minimumCount = 12,
): ChartViewport {
  if (dataLength <= 0) {
    return { start: 0, count: 0 };
  }
  const safeMinimum = Math.min(Math.max(1, minimumCount), dataLength);
  const count = Math.min(dataLength, Math.max(safeMinimum, Math.round(viewport.count)));
  const start = Math.min(Math.max(0, Math.round(viewport.start)), dataLength - count);
  return { start, count };
}

export function panViewport(
  viewport: ChartViewport,
  candleDelta: number,
  dataLength: number,
): ChartViewport {
  return normalizeViewport(
    { start: viewport.start + Math.round(candleDelta), count: viewport.count },
    dataLength,
  );
}

export function zoomViewport(
  viewport: ChartViewport,
  factor: number,
  dataLength: number,
  anchorIndex = viewport.start + (viewport.count - 1) / 2,
): ChartViewport {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError('Zoom factor must be a positive finite number.');
  }
  if (dataLength <= 0 || viewport.count <= 0) {
    return { start: 0, count: 0 };
  }

  const nextCount = Math.round(viewport.count * factor);
  const relativeAnchor = viewport.count <= 1
    ? 0.5
    : (anchorIndex - viewport.start) / (viewport.count - 1);
  const nextStart = anchorIndex - relativeAnchor * (nextCount - 1);
  return normalizeViewport({ start: nextStart, count: nextCount }, dataLength);
}

export function clientXToDataIndex(
  clientX: number,
  plotLeft: number,
  plotWidth: number,
  viewport: ChartViewport,
): number | null {
  if (viewport.count <= 0 || plotWidth <= 0) {
    return null;
  }
  const ratio = Math.min(1, Math.max(0, (clientX - plotLeft) / plotWidth));
  return viewport.start + Math.min(viewport.count - 1, Math.floor(ratio * viewport.count));
}

export function createPriceDomain(data: readonly OHLCV[]): NumericDomain {
  if (data.length === 0) {
    return { min: 0, max: 1 };
  }
  const minimum = Math.min(...data.map((candle) => candle.low));
  const maximum = Math.max(...data.map((candle) => candle.high));
  const spread = maximum - minimum;
  const padding = spread > 0 ? spread * 0.07 : Math.max(Math.abs(maximum) * 0.01, 1);
  return { min: minimum - padding, max: maximum + padding };
}

export function mapValueToY(
  value: number,
  domain: NumericDomain,
  top: number,
  height: number,
): number {
  const spread = domain.max - domain.min || 1;
  return top + ((domain.max - value) / spread) * height;
}

