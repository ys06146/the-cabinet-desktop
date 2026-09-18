import { createMarketAnalysis, type MarketAnalysis } from '../../domain/market-analysis';
import {
  calculateTechnicalIndicators,
  type TechnicalIndicators,
} from '../../domain/market-indicators';
import type { ChartRange, MarketSummary, OHLCV, StockQuote } from '../../domain/market';
import type { MarketDataProvider } from '../../providers/market/market-data-provider';
import { mockMarketDataProvider } from '../../providers/mock/mock-market-data-provider';

export interface MarketRoomOverview {
  summary: MarketSummary;
  watchlist: readonly StockQuote[];
}

export interface StockResearchSnapshot {
  quote: StockQuote;
  range: ChartRange;
  candles: readonly OHLCV[];
  indicators: TechnicalIndicators;
  analysis: MarketAnalysis;
}

export class MarketRoomService {
  constructor(private readonly provider: MarketDataProvider) {}

  async loadOverview(): Promise<MarketRoomOverview> {
    const [summary, watchlist] = await Promise.all([
      this.provider.getMarketSummary(),
      this.provider.getWatchlist(),
    ]);
    return { summary, watchlist };
  }

  async loadResearch(symbol: string, range: ChartRange): Promise<StockResearchSnapshot> {
    const [quote, candles] = await Promise.all([
      this.provider.getStockQuote(symbol),
      this.provider.getHistoricalData(symbol, range),
    ]);
    const indicators = calculateTechnicalIndicators(candles);
    const analysis = createMarketAnalysis(quote, candles, indicators);
    return { quote, range, candles, indicators, analysis };
  }
}

export const marketRoomService = new MarketRoomService(mockMarketDataProvider);

