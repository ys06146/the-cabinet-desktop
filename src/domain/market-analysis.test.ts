import { describe, expect, it } from 'vitest';
import type { OHLCV, StockQuote } from './market';
import { createMarketAnalysis } from './market-analysis';
import { calculateTechnicalIndicators, type TechnicalIndicators } from './market-indicators';

function createCandles(closes: readonly number[], volume = 1000): OHLCV[] {
  return closes.map((close, index) => ({
    timestamp: index * 86_400_000,
    open: index === 0 ? close : closes[index - 1],
    high: Math.max(close, index === 0 ? close : closes[index - 1]) + 1,
    low: Math.min(close, index === 0 ? close : closes[index - 1]) - 1,
    close,
    volume,
  }));
}

function createQuote(price: number): StockQuote {
  return {
    symbol: 'TEST',
    name: 'Test Company',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price,
    previousClose: price - 1,
    change: 1,
    changePercent: 1,
    volume: 1000,
    source: 'mock',
    updatedAt: '2026-07-30T08:30:00.000Z',
  };
}

function analyze(closes: readonly number[]): ReturnType<typeof createMarketAnalysis> {
  const candles = createCandles(closes);
  return createMarketAnalysis(
    createQuote(closes.at(-1) ?? 0),
    candles,
    calculateTechnicalIndicators(candles),
  );
}

describe('createMarketAnalysis', () => {
  it('describes an aligned upward structure from calculated values', () => {
    const result = analyze(Array.from({ length: 90 }, (_, index) => 100 + index * 1.2));

    expect(result.trend.state).toBe('Advancing');
    expect(result.momentum.state).toBe('Constructive');
    expect(result.movingAverageAlignment.state).toBe('Positive stack');
    expect(result.rsiState.state).toBe('Extended');
    expect(result.support?.low).toBeLessThan(result.support?.high ?? 0);
    expect(result.resistance?.low).toBeLessThan(result.resistance?.high ?? 0);
    expect(result.confidence.label).toBe('High');
  });

  it('describes an aligned downward structure', () => {
    const result = analyze(Array.from({ length: 90 }, (_, index) => 220 - index * 1.1));

    expect(result.trend.state).toBe('Retreating');
    expect(result.momentum.state).toBe('Softening');
    expect(result.movingAverageAlignment.state).toBe('Negative stack');
    expect(result.rsiState.state).toBe('Compressed');
    expect(result.positiveScenario).not.toContain('recovery');
  });

  it('keeps flat data neutral and finite', () => {
    const result = analyze(Array.from({ length: 90 }, () => 100));

    expect(result.trend.state).toBe('Transitional');
    expect(result.momentum.state).toBe('Mixed');
    expect(result.movingAverageAlignment.state).toBe('Mixed stack');
    expect(result.volumeChange.percent).toBe(0);
    expect(result.rsiState.value).toBe(50);
    expect(result.confidence.label).toBe('Moderate');
    expect(Number.isFinite(result.confidence.score)).toBe(true);
  });

  it('handles insufficient data without throwing and limits confidence', () => {
    const result = analyze([100, 101, 100, 102, 101, 103, 102, 104, 103, 105]);

    expect(result.rsiState.state).toBe('Unavailable');
    expect(result.volumeChange.percent).toBeNull();
    expect(result.confidence.label).toBe('Low');
    expect(result.confidence.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence.score).toBeLessThanOrEqual(100);
  });

  it('treats RSI values at 30 and 70 as threshold states', () => {
    const candles = createCandles(Array.from({ length: 70 }, () => 100));
    const base = calculateTechnicalIndicators(candles);
    const withRsi = (value: number): TechnicalIndicators => ({
      ...base,
      rsi14: base.rsi14.map((candidate, index) =>
        index === base.rsi14.length - 1 ? value : candidate,
      ),
    });
    const quote = createQuote(100);

    expect(createMarketAnalysis(quote, candles, withRsi(70)).rsiState.state).toBe('Extended');
    expect(createMarketAnalysis(quote, candles, withRsi(30)).rsiState.state).toBe('Compressed');
  });

  it('uses conditional research language without directive terms', () => {
    const result = analyze(Array.from({ length: 90 }, (_, index) => 100 + Math.sin(index / 4) * 5));
    const generatedLanguage = JSON.stringify(result);

    expect(result.positiveScenario.startsWith('If ')).toBe(true);
    expect(result.negativeScenario.startsWith('If ')).toBe(true);
    expect(generatedLanguage).not.toMatch(/매수|매도|사라|팔아|\bbuy\b|\bsell\b/i);
    expect(result.confidence.explanation).toContain('not forecast probability');
  });
});

