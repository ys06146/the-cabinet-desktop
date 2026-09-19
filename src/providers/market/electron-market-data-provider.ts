import type { MarketDataProvider } from './market-data-provider';

export const electronMarketDataProvider: MarketDataProvider = {
  getMarketSummary: () => window.theCabinet.getMarketSummary(),
  getWatchlist: () => window.theCabinet.getWatchlist(),
  getStockQuote: (symbol) => window.theCabinet.getStockQuote(symbol),
  getHistoricalData: (symbol, range) => window.theCabinet.getHistoricalData(symbol, range),
};
