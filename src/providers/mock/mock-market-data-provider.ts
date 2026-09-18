import type { ChartRange, MarketSummary, OHLCV, StockQuote } from '../../domain/market';
import type { MarketDataProvider } from '../market/market-data-provider';
import {
  MOCK_STOCK_FIXTURES,
  MOCK_SUMMARY_FIXTURES,
  type MockStockFixture,
} from './market-fixtures';

export type MarketDataOperation = 'summary' | 'watchlist' | 'quote' | 'history';

export interface MockLatencyRange {
  minMs: number;
  maxMs: number;
}

export interface MockMarketDataProviderOptions {
  latencyMs?: number | MockLatencyRange;
  failureRate?: number;
  failureRateByOperation?: Partial<Record<MarketDataOperation, number>>;
  random?: () => number;
  now?: () => Date;
}

interface RangeConfiguration {
  sessions: number;
  pointsPerSession: number;
  intervalMs: number;
}

const RANGE_CONFIGURATION: Record<ChartRange, RangeConfiguration> = {
  '1D': { sessions: 1, pointsPerSession: 78, intervalMs: 5 * 60 * 1000 },
  '1W': { sessions: 5, pointsPerSession: 13, intervalMs: 30 * 60 * 1000 },
  '1M': { sessions: 20, pointsPerSession: 3, intervalMs: 130 * 60 * 1000 },
  '3M': { sessions: 66, pointsPerSession: 1, intervalMs: 24 * 60 * 60 * 1000 },
  '1Y': { sessions: 252, pointsPerSession: 1, intervalMs: 24 * 60 * 60 * 1000 },
};

const DEFAULT_OPTIONS: Required<Pick<MockMarketDataProviderOptions, 'failureRate' | 'latencyMs'>> = {
  failureRate: 0,
  latencyMs: { minMs: 220, maxMs: 520 },
};

export class MockMarketDataError extends Error {
  constructor(operation: MarketDataOperation) {
    super(`Mock market data request failed during ${operation}.`);
    this.name = 'MockMarketDataError';
  }
}

function assertRate(rate: number, name: string): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError(`${name} must be between 0 and 1.`);
  }
}

function assertLatency(latency: number | MockLatencyRange): void {
  if (typeof latency === 'number') {
    if (!Number.isFinite(latency) || latency < 0) {
      throw new RangeError('latencyMs must be a non-negative number.');
    }
    return;
  }

  if (
    !Number.isFinite(latency.minMs) ||
    !Number.isFinite(latency.maxMs) ||
    latency.minMs < 0 ||
    latency.maxMs < latency.minMs
  ) {
    throw new RangeError('latencyMs must define a valid non-negative range.');
  }
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function roundPrice(value: number, currency: MockStockFixture['currency']): number {
  return currency === 'KRW' ? Math.round(value) : Math.round(value * 100) / 100;
}

function createTimestamps(now: Date, configuration: RangeConfiguration): number[] {
  const sessionDates: Date[] = [];
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);

  while (sessionDates.length < configuration.sessions) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      sessionDates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const nowTimestamp = now.getTime();
  return sessionDates.reverse().flatMap((sessionDate, sessionIndex) => {
    const scheduledEnd = Date.UTC(
      sessionDate.getUTCFullYear(),
      sessionDate.getUTCMonth(),
      sessionDate.getUTCDate(),
      20,
    );
    const sessionEnd = sessionIndex === configuration.sessions - 1
      ? Math.min(scheduledEnd, nowTimestamp)
      : scheduledEnd;
    const sessionStart = sessionEnd - (configuration.pointsPerSession - 1) * configuration.intervalMs;
    return Array.from(
      { length: configuration.pointsPerSession },
      (_, pointIndex) => sessionStart + pointIndex * configuration.intervalMs,
    );
  });
}

function createHistoricalData(
  fixture: MockStockFixture,
  range: ChartRange,
  now: Date,
): OHLCV[] {
  const configuration = RANGE_CONFIGURATION[range];
  const timestamps = createTimestamps(now, configuration);
  const random = createSeededRandom(hashText(`${fixture.symbol}:${range}`));
  const raw: OHLCV[] = [];
  let previousClose = fixture.price * (0.9 + random() * 0.08);
  const scaleFactor = range === '1D' ? 0.18 : range === '1W' ? 0.35 : range === '1M' ? 0.55 : 1;

  for (const timestamp of timestamps) {
    const drift = fixture.dailyDrift * scaleFactor;
    const shock = (random() - 0.5) * fixture.volatility * scaleFactor * 2;
    const open = previousClose * (1 + (random() - 0.5) * fixture.volatility * scaleFactor * 0.35);
    const close = previousClose * (1 + drift + shock);
    const wick = fixture.volatility * scaleFactor * (0.18 + random() * 0.48);
    const high = Math.max(open, close) * (1 + wick);
    const low = Math.min(open, close) * Math.max(0.01, 1 - wick * (0.7 + random() * 0.4));
    const volumePulse = 0.72 + random() * 0.62 + Math.abs(shock) * 8;

    raw.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.max(0, Math.round((fixture.volume / configuration.pointsPerSession) * volumePulse)),
    });
    previousClose = close;
  }

  const finalClose = raw.at(-1)?.close ?? fixture.price;
  const priceScale = fixture.price / finalClose;

  const normalized = raw.map((candle) => ({
    timestamp: candle.timestamp,
    open: roundPrice(candle.open * priceScale, fixture.currency),
    high: roundPrice(candle.high * priceScale, fixture.currency),
    low: roundPrice(candle.low * priceScale, fixture.currency),
    close: roundPrice(candle.close * priceScale, fixture.currency),
    volume: candle.volume,
  }));

  const previousQuoteClose = roundPrice(
    fixture.price / (1 + fixture.changePercent / 100),
    fixture.currency,
  );
  const previousCandle = normalized.at(-2);
  const finalCandle = normalized.at(-1);
  if (previousCandle) {
    previousCandle.close = previousQuoteClose;
    previousCandle.high = Math.max(previousCandle.high, previousCandle.open, previousCandle.close);
    previousCandle.low = Math.min(previousCandle.low, previousCandle.open, previousCandle.close);
  }
  if (finalCandle) {
    finalCandle.open = previousQuoteClose;
    finalCandle.close = fixture.price;
    finalCandle.high = Math.max(finalCandle.high, finalCandle.open, finalCandle.close);
    finalCandle.low = Math.min(finalCandle.low, finalCandle.open, finalCandle.close);
  }

  return normalized;
}

function createQuote(fixture: MockStockFixture, updatedAt: string): StockQuote {
  const previousClose = roundPrice(
    fixture.price / (1 + fixture.changePercent / 100),
    fixture.currency,
  );
  return {
    symbol: fixture.symbol,
    name: fixture.name,
    region: fixture.region,
    exchange: fixture.exchange,
    currency: fixture.currency,
    price: fixture.price,
    previousClose: roundPrice(previousClose, fixture.currency),
    change: roundPrice(fixture.price - previousClose, fixture.currency),
    changePercent: fixture.changePercent,
    volume: fixture.volume,
    source: 'mock',
    updatedAt,
  };
}

export class MockMarketDataProvider implements MarketDataProvider {
  private readonly latencyMs: number | MockLatencyRange;
  private readonly failureRate: number;
  private readonly failureRateByOperation: Partial<Record<MarketDataOperation, number>>;
  private readonly random: () => number;
  private readonly now: () => Date;

  constructor(options: MockMarketDataProviderOptions = {}) {
    this.latencyMs = options.latencyMs ?? DEFAULT_OPTIONS.latencyMs;
    this.failureRate = options.failureRate ?? DEFAULT_OPTIONS.failureRate;
    this.failureRateByOperation = options.failureRateByOperation ?? {};
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());

    assertLatency(this.latencyMs);
    assertRate(this.failureRate, 'failureRate');
    for (const [operation, rate] of Object.entries(this.failureRateByOperation)) {
      assertRate(rate, `failureRateByOperation.${operation}`);
    }
  }

  getMarketSummary(): Promise<MarketSummary> {
    return this.execute('summary', () => {
      const now = this.now();
      const updatedAt = now.toISOString();
      const hour = 60 * 60 * 1000;
      return {
        source: 'mock',
        updatedAt,
        items: MOCK_SUMMARY_FIXTURES.map((fixture) => ({
          id: fixture.id,
          label: fixture.label,
          value: fixture.value,
          changePercent: fixture.changePercent,
          unit: fixture.unit,
          source: 'mock',
          updatedAt,
          sparkline: fixture.sparkline.map((value, index) => ({
            timestamp: now.getTime() - (fixture.sparkline.length - 1 - index) * hour,
            value,
          })),
        })),
      };
    });
  }

  getWatchlist(): Promise<StockQuote[]> {
    return this.execute('watchlist', () => {
      const updatedAt = this.now().toISOString();
      return MOCK_STOCK_FIXTURES.map((fixture) => createQuote(fixture, updatedAt));
    });
  }

  getStockQuote(symbol: string): Promise<StockQuote> {
    return this.execute('quote', () => {
      const fixture = this.findFixture(symbol);
      return createQuote(fixture, this.now().toISOString());
    });
  }

  getHistoricalData(symbol: string, range: ChartRange): Promise<OHLCV[]> {
    return this.execute('history', () => {
      const fixture = this.findFixture(symbol);
      return createHistoricalData(fixture, range, this.now());
    });
  }

  private findFixture(symbol: string): MockStockFixture {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const fixture = MOCK_STOCK_FIXTURES.find(
      (candidate) => candidate.symbol.toUpperCase() === normalizedSymbol,
    );
    if (!fixture) {
      throw new Error(`Unknown market symbol: ${symbol}`);
    }
    return fixture;
  }

  private async execute<T>(operation: MarketDataOperation, createValue: () => T): Promise<T> {
    const latency = this.resolveLatency();
    if (latency > 0) {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, latency));
    } else {
      await Promise.resolve();
    }

    const failureRate = this.failureRateByOperation[operation] ?? this.failureRate;
    if (failureRate > 0 && this.random() < failureRate) {
      throw new MockMarketDataError(operation);
    }

    return createValue();
  }

  private resolveLatency(): number {
    if (typeof this.latencyMs === 'number') {
      return this.latencyMs;
    }
    const spread = this.latencyMs.maxMs - this.latencyMs.minMs;
    return Math.round(this.latencyMs.minMs + spread * this.random());
  }
}

export const mockMarketDataProvider = new MockMarketDataProvider();

