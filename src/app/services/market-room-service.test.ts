import { describe, expect, it } from 'vitest';
import { MarketRoomService } from './market-room-service';
import { MARKET_STOCKS } from '../../domain/market-catalog';
import type { StockQuote } from '../../domain/market';
import type { MarketDataProvider } from '../../providers/market/market-data-provider';

function provider(): MarketDataProvider {
  const quotes: StockQuote[] = MARKET_STOCKS.map((stock) => ({
    ...stock, price: 100, previousClose: 99, change: 1, changePercent: 1.01, volume: 500,
    source: 'yahoo', updatedAt: '2026-09-18T20:00:00.000Z',
  }));
  return {
    getWatchlist: async () => quotes,
    getMarketSummary: async () => ({ items: [], source: 'yahoo', updatedAt: quotes[0].updatedAt }),
    getStockQuote: async () => quotes[0],
    getHistoricalData: async () => [],
  };
}

describe('MarketRoomService partial outages', () => {
  it('keeps stocks visible with a warning when market indices fail', async () => {
    const data = provider();
    data.getMarketSummary = async () => { throw new Error('Index feed unavailable'); };
    const overview = await new MarketRoomService(data).loadOverview();
    expect(overview.summary).toBeNull();
    expect(overview.watchlist).toHaveLength(11);
    expect(overview.warnings).toEqual(['시장 지수를 조회하지 못했습니다. 종목 시세는 계속 표시합니다.']);
  });

  it('identifies missing stock quotes without hiding successful ones', async () => {
    const data = provider();
    const allQuotes = await data.getWatchlist();
    data.getWatchlist = async () => allQuotes.filter((quote) => quote.symbol !== 'AAPL');
    const overview = await new MarketRoomService(data).loadOverview();
    expect(overview.watchlist).toHaveLength(10);
    expect(overview.warnings).toHaveLength(1);
    expect(overview.warnings[0]).toContain('Apple');
  });
});
