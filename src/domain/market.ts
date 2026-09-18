export const CHART_RANGES = ['1D', '1W', '1M', '3M', '1Y'] as const;

export type ChartRange = (typeof CHART_RANGES)[number];
export type MarketRegion = 'domestic' | 'us';
export type MarketDataSource = 'mock';
export type MarketCurrency = 'KRW' | 'USD';
export type MarketExchange = 'KRX' | 'NASDAQ' | 'NYSE';

export type MarketSummaryId =
  | 'kospi'
  | 'kosdaq'
  | 'sp500'
  | 'nasdaq'
  | 'dow-jones'
  | 'usd-krw'
  | 'fear-greed'
  | 'volatility';

export type MarketSummaryUnit = 'index' | 'exchange-rate' | 'score';

export interface TimeSeriesValue {
  timestamp: number;
  value: number;
}

export interface MarketSummaryItem {
  id: MarketSummaryId;
  label: string;
  value: number;
  changePercent: number;
  unit: MarketSummaryUnit;
  sparkline: readonly TimeSeriesValue[];
  source: MarketDataSource;
  updatedAt: string;
}

export interface MarketSummary {
  items: readonly MarketSummaryItem[];
  source: MarketDataSource;
  updatedAt: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  region: MarketRegion;
  exchange: MarketExchange;
  currency: MarketCurrency;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  source: MarketDataSource;
  updatedAt: string;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

