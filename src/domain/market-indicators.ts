import type { OHLCV } from './market';

export type IndicatorValue = number | null;

export interface MacdSeries {
  macd: readonly IndicatorValue[];
  signal: readonly IndicatorValue[];
  histogram: readonly IndicatorValue[];
}

export interface TechnicalIndicators {
  sma5: readonly IndicatorValue[];
  sma20: readonly IndicatorValue[];
  sma60: readonly IndicatorValue[];
  rsi14: readonly IndicatorValue[];
  macd: MacdSeries;
}

function assertPeriod(period: number): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new RangeError('Indicator period must be a positive integer.');
  }
}

function assertFiniteValues(values: readonly number[]): void {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('Indicator inputs must contain only finite numbers.');
  }
}

export function calculateSma(values: readonly number[], period: number): IndicatorValue[] {
  assertPeriod(period);
  assertFiniteValues(values);

  const result: IndicatorValue[] = Array.from({ length: values.length }, () => null);
  if (values.length < period) {
    return result;
  }

  let rollingTotal = 0;
  for (let index = 0; index < values.length; index += 1) {
    rollingTotal += values[index];
    if (index >= period) {
      rollingTotal -= values[index - period];
    }
    if (index >= period - 1) {
      result[index] = rollingTotal / period;
    }
  }
  return result;
}

export function calculateEma(values: readonly number[], period: number): IndicatorValue[] {
  assertPeriod(period);
  assertFiniteValues(values);

  const result: IndicatorValue[] = Array.from({ length: values.length }, () => null);
  if (values.length < period) {
    return result;
  }

  const seed = values.slice(0, period).reduce((total, value) => total + value, 0) / period;
  const multiplier = 2 / (period + 1);
  result[period - 1] = seed;

  let previous = seed;
  for (let index = period; index < values.length; index += 1) {
    previous = (values[index] - previous) * multiplier + previous;
    result[index] = previous;
  }
  return result;
}

export function calculateRsi(values: readonly number[], period = 14): IndicatorValue[] {
  assertPeriod(period);
  assertFiniteValues(values);

  const result: IndicatorValue[] = Array.from({ length: values.length }, () => null);
  if (values.length <= period) {
    return result;
  }

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const difference = values[index] - values[index - 1];
    gains += Math.max(difference, 0);
    losses += Math.max(-difference, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  const toRsi = (): number => {
    if (averageGain === 0 && averageLoss === 0) {
      return 50;
    }
    if (averageLoss === 0) {
      return 100;
    }
    if (averageGain === 0) {
      return 0;
    }
    return 100 - 100 / (1 + averageGain / averageLoss);
  };

  result[period] = toRsi();
  for (let index = period + 1; index < values.length; index += 1) {
    const difference = values[index] - values[index - 1];
    const gain = Math.max(difference, 0);
    const loss = Math.max(-difference, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result[index] = toRsi();
  }

  return result;
}

export function calculateMacd(
  values: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdSeries {
  assertPeriod(fastPeriod);
  assertPeriod(slowPeriod);
  assertPeriod(signalPeriod);
  assertFiniteValues(values);
  if (fastPeriod >= slowPeriod) {
    throw new RangeError('MACD fast period must be shorter than its slow period.');
  }

  const fast = calculateEma(values, fastPeriod);
  const slow = calculateEma(values, slowPeriod);
  const macd: IndicatorValue[] = values.map((_, index) => {
    const fastValue = fast[index];
    const slowValue = slow[index];
    return fastValue === null || slowValue === null ? null : fastValue - slowValue;
  });

  const validMacd = macd.filter((value): value is number => value !== null);
  const compactSignal = calculateEma(validMacd, signalPeriod);
  const signal: IndicatorValue[] = Array.from({ length: values.length }, () => null);
  let compactIndex = 0;
  for (let index = 0; index < macd.length; index += 1) {
    if (macd[index] !== null) {
      signal[index] = compactSignal[compactIndex];
      compactIndex += 1;
    }
  }

  const histogram: IndicatorValue[] = macd.map((value, index) => {
    const signalValue = signal[index];
    return value === null || signalValue === null ? null : value - signalValue;
  });

  return { macd, signal, histogram };
}

export function calculateTechnicalIndicators(data: readonly OHLCV[]): TechnicalIndicators {
  const closes = data.map((candle) => candle.close);
  return {
    sma5: calculateSma(closes, 5),
    sma20: calculateSma(closes, 20),
    sma60: calculateSma(closes, 60),
    rsi14: calculateRsi(closes, 14),
    macd: calculateMacd(closes),
  };
}

export function getLatestIndicatorValue(series: readonly IndicatorValue[]): number | null {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (value !== null) {
      return value;
    }
  }
  return null;
}

