import type {
  MarketCurrency,
  MarketExchange,
  MarketRegion,
  MarketSummaryId,
  MarketSummaryUnit,
} from '../../domain/market';

export interface MockStockFixture {
  symbol: string;
  name: string;
  region: MarketRegion;
  exchange: MarketExchange;
  currency: MarketCurrency;
  price: number;
  changePercent: number;
  volume: number;
  dailyDrift: number;
  volatility: number;
}

export interface MockSummaryFixture {
  id: MarketSummaryId;
  label: string;
  value: number;
  changePercent: number;
  unit: MarketSummaryUnit;
  sparkline: readonly number[];
}

export const MOCK_STOCK_FIXTURES: readonly MockStockFixture[] = [
  {
    symbol: '005930.KS',
    name: '삼성전자',
    region: 'domestic',
    exchange: 'KRX',
    currency: 'KRW',
    price: 74200,
    changePercent: 1.23,
    volume: 16_284_921,
    dailyDrift: 0.00045,
    volatility: 0.012,
  },
  {
    symbol: '000660.KS',
    name: 'SK하이닉스',
    region: 'domestic',
    exchange: 'KRX',
    currency: 'KRW',
    price: 218500,
    changePercent: 2.1,
    volume: 4_391_882,
    dailyDrift: 0.0007,
    volatility: 0.018,
  },
  {
    symbol: '005380.KS',
    name: '현대차',
    region: 'domestic',
    exchange: 'KRX',
    currency: 'KRW',
    price: 286000,
    changePercent: -0.52,
    volume: 1_108_476,
    dailyDrift: 0.00025,
    volatility: 0.013,
  },
  {
    symbol: '035420.KS',
    name: 'NAVER',
    region: 'domestic',
    exchange: 'KRX',
    currency: 'KRW',
    price: 221500,
    changePercent: 0.91,
    volume: 923_774,
    dailyDrift: 0.00035,
    volatility: 0.016,
  },
  {
    symbol: '012450.KS',
    name: '한화에어로스페이스',
    region: 'domestic',
    exchange: 'KRX',
    currency: 'KRW',
    price: 432000,
    changePercent: -1.14,
    volume: 694_210,
    dailyDrift: 0.0008,
    volatility: 0.022,
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 227.42,
    changePercent: 0.74,
    volume: 48_309_420,
    dailyDrift: 0.0004,
    volatility: 0.011,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 468.18,
    changePercent: -0.33,
    volume: 19_628_340,
    dailyDrift: 0.00045,
    volatility: 0.012,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 141.97,
    changePercent: 2.46,
    volume: 241_553_800,
    dailyDrift: 0.0009,
    volatility: 0.024,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 319.28,
    changePercent: -1.87,
    volume: 112_844_190,
    dailyDrift: 0.0003,
    volatility: 0.028,
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 192.31,
    changePercent: 0.41,
    volume: 27_149_650,
    dailyDrift: 0.0004,
    volatility: 0.013,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon',
    region: 'us',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 205.76,
    changePercent: 1.08,
    volume: 35_883_120,
    dailyDrift: 0.0005,
    volatility: 0.015,
  },
] as const;

export const MOCK_SUMMARY_FIXTURES: readonly MockSummaryFixture[] = [
  {
    id: 'kospi',
    label: 'KOSPI',
    value: 2784.62,
    changePercent: 0.68,
    unit: 'index',
    sparkline: [2751, 2758, 2749, 2765, 2773, 2769, 2781, 2784.62],
  },
  {
    id: 'kosdaq',
    label: 'KOSDAQ',
    value: 842.17,
    changePercent: -0.34,
    unit: 'index',
    sparkline: [849, 847, 851, 846, 844, 845, 841, 842.17],
  },
  {
    id: 'sp500',
    label: 'S&P 500',
    value: 6129.58,
    changePercent: 0.52,
    unit: 'index',
    sparkline: [6082, 6091, 6087, 6104, 6116, 6108, 6122, 6129.58],
  },
  {
    id: 'nasdaq',
    label: 'NASDAQ',
    value: 20173.89,
    changePercent: 0.81,
    unit: 'index',
    sparkline: [19982, 20014, 19996, 20071, 20108, 20092, 20151, 20173.89],
  },
  {
    id: 'dow-jones',
    label: 'Dow Jones',
    value: 44837.56,
    changePercent: -0.18,
    unit: 'index',
    sparkline: [44940, 44892, 44921, 44871, 44863, 44890, 44821, 44837.56],
  },
  {
    id: 'usd-krw',
    label: 'USD/KRW',
    value: 1381.4,
    changePercent: 0.27,
    unit: 'exchange-rate',
    sparkline: [1374.1, 1376.4, 1375.8, 1379.2, 1380.6, 1378.9, 1382.1, 1381.4],
  },
  {
    id: 'fear-greed',
    label: 'Fear & Greed',
    value: 62,
    changePercent: 4.84,
    unit: 'score',
    sparkline: [51, 54, 53, 56, 58, 57, 60, 62],
  },
  {
    id: 'volatility',
    label: 'Volatility',
    value: 16.21,
    changePercent: -2.35,
    unit: 'index',
    sparkline: [17.8, 17.2, 17.6, 16.9, 16.7, 16.8, 16.4, 16.21],
  },
] as const;

