import type { MarketCurrency, MarketExchange, MarketRegion } from './market';

export interface MarketStock {
  symbol: string;
  name: string;
  region: MarketRegion;
  exchange: MarketExchange;
  currency: MarketCurrency;
}

// Identity metadata only: prices and timestamps always come from the provider.
export const MARKET_STOCKS: readonly MarketStock[] = [
  { symbol: '005930.KS', name: '삼성전자', region: 'domestic', exchange: 'KRX', currency: 'KRW' },
  { symbol: '000660.KS', name: 'SK하이닉스', region: 'domestic', exchange: 'KRX', currency: 'KRW' },
  { symbol: '005380.KS', name: '현대차', region: 'domestic', exchange: 'KRX', currency: 'KRW' },
  { symbol: '035420.KS', name: 'NAVER', region: 'domestic', exchange: 'KRX', currency: 'KRW' },
  { symbol: '012450.KS', name: '한화에어로스페이스', region: 'domestic', exchange: 'KRX', currency: 'KRW' },
  { symbol: 'AAPL', name: 'Apple', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon', region: 'us', exchange: 'NASDAQ', currency: 'USD' },
];

export function getMarketStock(symbol: string): MarketStock {
  const stock = typeof symbol === 'string'
    ? MARKET_STOCKS.find((entry) => entry.symbol === symbol)
    : undefined;
  if (!stock) throw new Error('지원하지 않는 종목입니다.');
  return stock;
}
