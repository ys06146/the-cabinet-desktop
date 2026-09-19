import { createMarketAnalysis, type MarketAnalysis } from '../../domain/market-analysis';
import {
  calculateTechnicalIndicators,
  type TechnicalIndicators,
} from '../../domain/market-indicators';
import type { ChartRange, MarketSummary, OHLCV, StockQuote } from '../../domain/market';
import { MARKET_STOCKS } from '../../domain/market-catalog';
import type { MarketDataProvider } from '../../providers/market/market-data-provider';
import { electronMarketDataProvider } from '../../providers/market/electron-market-data-provider';

export interface MarketRoomOverview {
  summary: MarketSummary | null;
  watchlist: readonly StockQuote[];
  warnings: readonly string[];
}

export interface StockResearchSnapshot {
  quote: StockQuote;
  range: ChartRange;
  candles: readonly OHLCV[];
  indicators: TechnicalIndicators;
  analysis: MarketAnalysis;
  chartSource: 'yahoo' | 'mock';
  chartDelayMinutes: number;
}

export class MarketRoomService {
  constructor(private readonly provider: MarketDataProvider) {}

  async loadOverview(): Promise<MarketRoomOverview> {
    const [summaryResult, watchlistResult] = await Promise.allSettled([
      this.provider.getMarketSummary(),
      this.provider.getWatchlist(),
    ]);
    if (watchlistResult.status === 'rejected') throw watchlistResult.reason;
    const watchlist = watchlistResult.value;
    const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
    const missing = MARKET_STOCKS.filter((stock) => !watchlist.some((quote) => quote.symbol === stock.symbol));
    const warnings = [
      ...(summary ? summary.warnings ?? [] : ['시장 지수를 조회하지 못했습니다. 종목 시세는 계속 표시합니다.']),
      ...(missing.length ? ['시세 조회 실패: ' + missing.map((stock) => stock.name).join(', ') + '. 다음 갱신 때 다시 시도합니다.'] : []),
    ];
    return { summary, watchlist, warnings };
  }

  async loadResearch(symbol: string, range: ChartRange): Promise<StockResearchSnapshot> {
    const [quote, candles] = await Promise.all([
      this.provider.getStockQuote(symbol),
      this.provider.getHistoricalData(symbol, range),
    ]);
    const indicators = calculateTechnicalIndicators(candles);
    const analysis = createMarketAnalysis(quote, candles, indicators);
    return {
      quote, range, candles, indicators, analysis,
      chartSource: quote.source === 'mock' ? 'mock' : 'yahoo',
      chartDelayMinutes: quote.source !== 'mock' && quote.region === 'domestic' ? 20 : 0,
    };
  }
}

export const marketRoomService = new MarketRoomService(electronMarketDataProvider);
