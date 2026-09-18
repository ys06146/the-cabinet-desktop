import type { ChartRange, MarketSummary, OHLCV, StockQuote } from '../../domain/market';

export interface MarketDataProvider {
  getMarketSummary(): Promise<MarketSummary>;
  getWatchlist(): Promise<StockQuote[]>;
  getStockQuote(symbol: string): Promise<StockQuote>;
  getHistoricalData(symbol: string, range: ChartRange): Promise<OHLCV[]>;
}

