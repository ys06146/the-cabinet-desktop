import { describe, expect, it } from 'vitest';
import {
  calculateMacd,
  calculateRsi,
  calculateSma,
  calculateTechnicalIndicators,
} from './market-indicators';
import type { OHLCV } from './market';

describe('market indicators', () => {
  it('calculates aligned SMA 5, 20, and 60 values', () => {
    const values = Array.from({ length: 60 }, (_, index) => index + 1);

    const sma5 = calculateSma(values, 5);
    const sma20 = calculateSma(values, 20);
    const sma60 = calculateSma(values, 60);

    expect(sma5.slice(0, 4)).toEqual([null, null, null, null]);
    expect(sma5[4]).toBe(3);
    expect(sma5[59]).toBe(58);
    expect(sma20[19]).toBe(10.5);
    expect(sma20[59]).toBe(50.5);
    expect(sma60.slice(0, 59).every((value) => value === null)).toBe(true);
    expect(sma60[59]).toBe(30.5);
  });

  it('uses Wilder smoothing for RSI 14', () => {
    const values = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28, 46, 46.03, 46.41, 46.22, 45.64,
    ];
    const rsi = calculateRsi(values, 14);

    expect(rsi.slice(0, 14).every((value) => value === null)).toBe(true);
    expect(rsi[14]).toBeCloseTo(70.4641350211, 9);
    expect(rsi[15]).toBeCloseTo(66.2496185536, 9);
    expect(rsi[19]).toBeCloseTo(57.9150206701, 9);
  });

  it('handles rising, falling, and flat RSI inputs without NaN', () => {
    expect(calculateRsi(Array.from({ length: 20 }, (_, index) => index), 14).at(-1)).toBe(100);
    expect(calculateRsi(Array.from({ length: 20 }, (_, index) => 20 - index), 14).at(-1)).toBe(0);
    expect(calculateRsi(Array.from({ length: 20 }, () => 100), 14).at(-1)).toBe(50);
  });

  it('calculates SMA-seeded MACD, signal, and histogram', () => {
    const linear = Array.from({ length: 40 }, (_, index) => index + 1);
    const linearMacd = calculateMacd(linear);
    expect(linearMacd.macd[25]).toBeCloseTo(7, 10);
    expect(linearMacd.signal[33]).toBeCloseTo(7, 10);
    expect(linearMacd.histogram[33]).toBeCloseTo(0, 10);

    const step = [...Array.from({ length: 26 }, () => 0), ...Array.from({ length: 14 }, () => 1)];
    const stepMacd = calculateMacd(step);
    expect(stepMacd.macd[26]).toBeCloseTo(0.0797720797721, 10);
    expect(stepMacd.macd[33]).toBeCloseTo(0.277487459846, 10);
    expect(stepMacd.signal[33]).toBeCloseTo(0.187992975481, 10);
    expect(stepMacd.histogram[33]).toBeCloseTo(0.089494484365, 10);
  });

  it('keeps every calculated series aligned with OHLCV input', () => {
    const candles: OHLCV[] = Array.from({ length: 70 }, (_, index) => ({
      timestamp: index,
      open: index + 10,
      high: index + 12,
      low: index + 9,
      close: index + 11,
      volume: 1000 + index,
    }));
    const snapshot = JSON.stringify(candles);
    const indicators = calculateTechnicalIndicators(candles);

    expect(indicators.sma5).toHaveLength(candles.length);
    expect(indicators.sma20).toHaveLength(candles.length);
    expect(indicators.sma60).toHaveLength(candles.length);
    expect(indicators.rsi14).toHaveLength(candles.length);
    expect(indicators.macd.macd).toHaveLength(candles.length);
    expect(indicators.macd.signal).toHaveLength(candles.length);
    expect(indicators.macd.histogram).toHaveLength(candles.length);
    expect(JSON.stringify(candles)).toBe(snapshot);
  });

  it('rejects invalid periods and non-finite inputs', () => {
    expect(() => calculateSma([1, 2, 3], 0)).toThrow(RangeError);
    expect(() => calculateSma([1, Number.NaN], 2)).toThrow(TypeError);
    expect(() => calculateMacd([1, 2, 3], 26, 12, 9)).toThrow(RangeError);
  });
});

