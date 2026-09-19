import type { OHLCV, StockQuote } from './market';
import {
  getLatestIndicatorValue,
  type IndicatorValue,
  type TechnicalIndicators,
} from './market-indicators';

export type AnalysisTone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface AnalysisObservation {
  state: string;
  detail: string;
  tone: AnalysisTone;
}

export interface PriceZone {
  low: number;
  high: number;
}

export interface MarketAnalysis {
  trend: AnalysisObservation;
  momentum: AnalysisObservation;
  movingAverageAlignment: AnalysisObservation;
  volumeChange: AnalysisObservation & { percent: number | null };
  rsiState: AnalysisObservation & { value: number | null };
  support: PriceZone | null;
  resistance: PriceZone | null;
  positiveScenario: string;
  negativeScenario: string;
  riskFactors: readonly string[];
  confidence: {
    score: number;
    label: 'Low' | 'Moderate' | 'High';
    explanation: string;
  };
}

function latest(series: readonly IndicatorValue[]): number | null {
  return getLatestIndicatorValue(series);
}

function valueAtOrBefore(series: readonly IndicatorValue[], index: number): number | null {
  for (let cursor = Math.min(index, series.length - 1); cursor >= 0; cursor -= 1) {
    const value = series[cursor];
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function formatLevel(value: number | null, quote: StockQuote): string {
  if (value === null) {
    return 'the latest observed range';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: quote.currency,
    maximumFractionDigits: quote.currency === 'KRW' ? 0 : 2,
  }).format(value);
}

function createZone(value: number): PriceZone {
  return { low: value * 0.995, high: value * 1.005 };
}

function calculateAnnualizedVolatility(data: readonly OHLCV[]): number {
  const sampleStart = Math.max(1, data.length - 60);
  const returns: number[] = [];
  const intervals: number[] = [];
  for (let index = sampleStart; index < data.length; index += 1) {
    const previous = data[index - 1].close;
    if (previous > 0) {
      returns.push(data[index].close / previous - 1);
    }
    const interval = data[index].timestamp - data[index - 1].timestamp;
    if (interval > 0) {
      intervals.push(interval);
    }
  }
  if (returns.length < 2 || intervals.length === 0) {
    return 0;
  }
  const mean = average(returns);
  const variance =
    returns.reduce((total, value) => total + (value - mean) ** 2, 0) / (returns.length - 1);
  const sortedIntervals = [...intervals].sort((left, right) => left - right);
  const medianMinutes = sortedIntervals[Math.floor(sortedIntervals.length / 2)] / 60_000;
  const periodsPerYear = medianMinutes <= 10
    ? 252 * 78
    : medianMinutes <= 60
      ? 252 * 13
      : medianMinutes <= 240
        ? 252 * 3
        : 252;
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

export function createMarketAnalysis(
  quote: StockQuote,
  data: readonly OHLCV[],
  indicators: TechnicalIndicators,
): MarketAnalysis {
  const finalCandle = data.at(-1) ?? null;
  const currentClose = finalCandle?.close ?? quote.price;
  const sma5 = latest(indicators.sma5);
  const sma20 = latest(indicators.sma20);
  const sma60 = latest(indicators.sma60);
  const previousSma20 = valueAtOrBefore(indicators.sma20, indicators.sma20.length - 6);
  const rsi = latest(indicators.rsi14);
  const macd = latest(indicators.macd.macd);
  const signal = latest(indicators.macd.signal);
  const histogram = latest(indicators.macd.histogram);

  let trend: AnalysisObservation;
  if (
    sma20 !== null &&
    previousSma20 !== null &&
    currentClose > sma20 &&
    sma20 > previousSma20 &&
    (sma60 === null || currentClose > sma60)
  ) {
    trend = {
      state: 'Advancing',
      detail: 'Price is above a rising 20-period average, with the broader structure holding.',
      tone: 'positive',
    };
  } else if (
    sma20 !== null &&
    previousSma20 !== null &&
    currentClose < sma20 &&
    sma20 < previousSma20 &&
    (sma60 === null || currentClose < sma60)
  ) {
    trend = {
      state: 'Retreating',
      detail: 'Price is below a falling 20-period average, indicating a weaker structure.',
      tone: 'negative',
    };
  } else {
    trend = {
      state: 'Transitional',
      detail: 'Price and the 20-period average do not yet describe a consistent direction.',
      tone: 'neutral',
    };
  }

  let momentum: AnalysisObservation;
  if (macd !== null && signal !== null && histogram !== null && macd > signal && histogram > 0) {
    momentum = {
      state: 'Constructive',
      detail: 'MACD is above its signal line and the histogram is positive.',
      tone: 'positive',
    };
  } else if (
    macd !== null &&
    signal !== null &&
    histogram !== null &&
    macd < signal &&
    histogram < 0
  ) {
    momentum = {
      state: 'Softening',
      detail: 'MACD is below its signal line and the histogram is negative.',
      tone: 'negative',
    };
  } else {
    momentum = {
      state: 'Mixed',
      detail: 'Momentum components are incomplete or not aligned in one direction.',
      tone: 'neutral',
    };
  }

  let movingAverageAlignment: AnalysisObservation;
  if (sma5 !== null && sma20 !== null && sma60 !== null && sma5 > sma20 && sma20 > sma60) {
    movingAverageAlignment = {
      state: 'Positive stack',
      detail: 'SMA 5 is above SMA 20, and SMA 20 is above SMA 60.',
      tone: 'positive',
    };
  } else if (sma5 !== null && sma20 !== null && sma60 !== null && sma5 < sma20 && sma20 < sma60) {
    movingAverageAlignment = {
      state: 'Negative stack',
      detail: 'SMA 5 is below SMA 20, and SMA 20 is below SMA 60.',
      tone: 'negative',
    };
  } else {
    movingAverageAlignment = {
      state: 'Mixed stack',
      detail: 'The three moving averages are not in a strict directional order.',
      tone: 'neutral',
    };
  }

  const recentVolumes = data.slice(-5).map((candle) => candle.volume);
  const baselineVolumes = data.slice(-25, -5).map((candle) => candle.volume);
  const recentVolume = average(recentVolumes);
  const baselineVolume = average(baselineVolumes);
  const volumePercent = recentVolumes.length === 5 && baselineVolumes.length === 20 && baselineVolume > 0
    ? ((recentVolume - baselineVolume) / baselineVolume) * 100
    : null;
  const volumeChange: MarketAnalysis['volumeChange'] =
    volumePercent === null
      ? {
          state: 'Insufficient baseline',
          detail: 'A 20-period comparison baseline is not yet available.',
          tone: 'neutral',
          percent: null,
        }
      : volumePercent > 20
        ? {
            state: 'Expanding',
            detail: `Recent volume is ${Math.abs(volumePercent).toFixed(1)}% above its prior baseline.`,
            tone: 'warning',
            percent: volumePercent,
          }
        : volumePercent < -20
          ? {
              state: 'Contracting',
              detail: `Recent volume is ${Math.abs(volumePercent).toFixed(1)}% below its prior baseline.`,
              tone: 'neutral',
              percent: volumePercent,
            }
          : {
              state: 'Stable',
              detail: `Recent volume differs from its prior baseline by ${volumePercent.toFixed(1)}%.`,
              tone: 'neutral',
              percent: volumePercent,
            };

  const rsiState: MarketAnalysis['rsiState'] =
    rsi === null
      ? {
          state: 'Unavailable',
          detail: 'RSI 14 requires a longer price history.',
          tone: 'neutral',
          value: null,
        }
      : rsi >= 70
        ? {
            state: 'Extended',
            detail: 'RSI is at or above 70, where short-term extension risk is elevated.',
            tone: 'warning',
            value: rsi,
          }
        : rsi <= 30
          ? {
              state: 'Compressed',
              detail: 'RSI is at or below 30, reflecting unusually weak recent momentum.',
              tone: 'warning',
              value: rsi,
            }
          : {
              state: 'Balanced',
              detail: 'RSI remains between 30 and 70.',
              tone: 'neutral',
              value: rsi,
            };

  const recentStructure = data.slice(-20);
  const supportValue = recentStructure.length > 0
    ? Math.min(...recentStructure.map((candle) => candle.low))
    : null;
  const resistanceValue = recentStructure.length > 0
    ? Math.max(...recentStructure.map((candle) => candle.high))
    : null;
  const support = supportValue === null ? null : createZone(supportValue);
  const resistance = resistanceValue === null ? null : createZone(resistanceValue);

  const positiveScenario = trend.tone === 'positive'
    ? `If price sustains above ${formatLevel(resistance?.low ?? null, quote)} while momentum remains constructive, the prevailing upward structure may extend.`
    : trend.tone === 'negative'
      ? `If price reclaims ${formatLevel(resistance?.high ?? null, quote)} and momentum stabilizes, current pressure may begin to ease.`
      : `If price establishes above ${formatLevel(resistance?.high ?? null, quote)} with firmer momentum, the range may resolve constructively.`;
  const negativeScenario = trend.tone === 'negative'
    ? `If price remains below ${formatLevel(support?.high ?? null, quote)} while momentum stays soft, the weaker structure may persist.`
    : `If price weakens below ${formatLevel(support?.low ?? null, quote)} while momentum and volume deteriorate, the recent structure may become less stable.`;

  const riskFactors: string[] = [];
  if (rsi !== null && (rsi >= 70 || rsi <= 30)) {
    riskFactors.push('RSI is near an extreme, which can make short-term movement less stable.');
  }
  if (calculateAnnualizedVolatility(data) > 0.45) {
    riskFactors.push('Recent price variation is elevated relative to the available sample.');
  }
  if (
    trend.tone !== 'neutral' &&
    momentum.tone !== 'neutral' &&
    trend.tone !== momentum.tone
  ) {
    riskFactors.push('Trend and momentum rules currently point in different directions.');
  }
  if (volumePercent !== null && Math.abs(volumePercent) > 50) {
    riskFactors.push('Volume differs sharply from its comparison baseline.');
  }
  riskFactors.push(quote.source === 'mock'
    ? 'All values are simulated and omit live events, liquidity, and execution conditions.'
    : 'Indicators use the displayed historical bars. Provider delays, session differences, news, liquidity, and execution conditions are not captured by these rules.');

  const availableIndicators = [sma5, sma20, sma60, rsi, macd, signal].filter(
    (value) => value !== null,
  ).length;
  const ruleTones = [trend.tone, momentum.tone, movingAverageAlignment.tone];
  const positiveCount = ruleTones.filter((tone) => tone === 'positive').length;
  const negativeCount = ruleTones.filter((tone) => tone === 'negative').length;
  const directionalCount = positiveCount + negativeCount;
  const agreement = Math.max(positiveCount, negativeCount) / ruleTones.length;
  const directionality = directionalCount / ruleTones.length;
  const sampleCompleteness = Math.min(1, data.length / 60);
  const indicatorCompleteness = availableIndicators / 6;
  const confidenceScore = Math.round(
    Math.min(
      92,
      Math.max(
        25,
        15 +
          sampleCompleteness * 20 +
          indicatorCompleteness * 20 +
          agreement * 20 +
          directionality * 10,
      ),
    ),
  );
  const confidenceLabel = confidenceScore >= 80 ? 'High' : confidenceScore >= 50 ? 'Moderate' : 'Low';

  return {
    trend,
    momentum,
    movingAverageAlignment,
    volumeChange,
    rsiState,
    support,
    resistance,
    positiveScenario,
    negativeScenario,
    riskFactors,
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      explanation: 'Confidence reflects sample completeness and agreement between rules, not forecast probability.',
    },
  };
}
