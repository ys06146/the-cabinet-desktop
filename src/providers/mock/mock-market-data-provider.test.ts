import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHART_RANGES } from '../../domain/market';
import {
  MockMarketDataError,
  MockMarketDataProvider,
} from './mock-market-data-provider';

const fixedNow = () => new Date('2026-07-30T08:30:00.000Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('MockMarketDataProvider', () => {
  it('returns all requested summary and watchlist entries', async () => {
    const provider = new MockMarketDataProvider({ latencyMs: 0, now: fixedNow });
    const [summary, watchlist] = await Promise.all([
      provider.getMarketSummary(),
      provider.getWatchlist(),
    ]);

    expect(summary.items.map((item) => item.label)).toEqual([
      'KOSPI',
      'KOSDAQ',
      'S&P 500',
      'NASDAQ',
      'Dow Jones',
      'USD/KRW',
      'Fear & Greed',
      'Volatility',
    ]);
    expect(watchlist.map((quote) => quote.name)).toEqual([
      '삼성전자',
      'SK하이닉스',
      '현대차',
      'NAVER',
      '한화에어로스페이스',
      'Apple',
      'Microsoft',
      'NVIDIA',
      'Tesla',
      'Alphabet',
      'Amazon',
    ]);
    expect(summary.source).toBe('mock');
    expect(watchlist.every((quote) => quote.source === 'mock')).toBe(true);
  });

  it('generates deterministic, ordered, valid OHLCV data for every range', async () => {
    const provider = new MockMarketDataProvider({ latencyMs: 0, now: fixedNow });

    for (const range of CHART_RANGES) {
      const first = await provider.getHistoricalData('NVDA', range);
      const second = await provider.getHistoricalData('NVDA', range);
      expect(first).toEqual(second);
      expect(first.length).toBeGreaterThanOrEqual(60);
      expect(first.at(-1)?.close).toBe(141.97);
      expect(
        first.every(
          (candle, index) =>
            candle.low <= candle.open &&
            candle.low <= candle.close &&
            candle.high >= candle.open &&
            candle.high >= candle.close &&
            candle.volume >= 0 &&
            (index === 0 || first[index - 1].timestamp < candle.timestamp),
        ),
      ).toBe(true);
    }
  });

  it('aligns quote changes, range spans, and intraday volume units', async () => {
    const provider = new MockMarketDataProvider({ latencyMs: 0, now: fixedNow });
    const watchlist = await provider.getWatchlist();
    for (const quote of watchlist) {
      const history = await provider.getHistoricalData(quote.symbol, '1Y');
      const previous = history.at(-2);
      const latest = history.at(-1);
      expect(previous?.close).toBe(quote.previousClose);
      expect(latest?.open).toBe(quote.previousClose);
      expect(latest?.close).toBe(quote.price);
      const calculatedChange = ((quote.price / quote.previousClose) - 1) * 100;
      expect(calculatedChange).toBeCloseTo(quote.changePercent, 2);
    }

    const intraday = await provider.getHistoricalData('AAPL', '1D');
    const intradayVolume = intraday.reduce((total, candle) => total + candle.volume, 0);
    const apple = watchlist.find((quote) => quote.symbol === 'AAPL');
    expect(intradayVolume).toBeGreaterThan((apple?.volume ?? 0) * 0.5);
    expect(intradayVolume).toBeLessThan((apple?.volume ?? 0) * 1.5);

    const day = 86_400_000;
    const minimumSpan: Record<(typeof CHART_RANGES)[number], number> = {
      '1D': 6 * 60 * 60 * 1000,
      '1W': 4 * day,
      '1M': 25 * day,
      '3M': 80 * day,
      '1Y': 330 * day,
    };
    for (const range of CHART_RANGES) {
      const history = await provider.getHistoricalData('AAPL', range);
      const span = (history.at(-1)?.timestamp ?? 0) - (history[0]?.timestamp ?? 0);
      expect(span).toBeGreaterThanOrEqual(minimumSpan[range]);
    }
  });

  it('returns defensive copies', async () => {
    const provider = new MockMarketDataProvider({ latencyMs: 0, now: fixedNow });
    const first = await provider.getWatchlist();
    first[0].price = 1;
    const second = await provider.getWatchlist();
    expect(second[0].price).toBe(74200);

    const firstHistory = await provider.getHistoricalData('AAPL', '1M');
    firstHistory[0].close = 1;
    const secondHistory = await provider.getHistoricalData('AAPL', '1M');
    expect(secondHistory[0].close).not.toBe(1);
  });

  it('supports forced failures and rejects unknown symbols', async () => {
    const failedProvider = new MockMarketDataProvider({
      failureRate: 1,
      latencyMs: 0,
      random: () => 0,
    });
    await expect(failedProvider.getMarketSummary()).rejects.toBeInstanceOf(MockMarketDataError);

    const provider = new MockMarketDataProvider({ latencyMs: 0 });
    await expect(provider.getStockQuote('UNKNOWN')).rejects.toThrow('Unknown market symbol');
  });

  it('can simulate asynchronous latency', async () => {
    vi.useFakeTimers();
    const provider = new MockMarketDataProvider({ latencyMs: 120, now: fixedNow });
    let settled = false;
    const request = provider.getWatchlist().then((quotes) => {
      settled = true;
      return quotes;
    });

    await vi.advanceTimersByTimeAsync(119);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toHaveLength(11);
  });

  it('validates simulation options', () => {
    expect(() => new MockMarketDataProvider({ failureRate: 1.1 })).toThrow(RangeError);
    expect(() => new MockMarketDataProvider({ latencyMs: -1 })).toThrow(RangeError);
    expect(
      () => new MockMarketDataProvider({ latencyMs: { minMs: 100, maxMs: 10 } }),
    ).toThrow(RangeError);
  });
});

