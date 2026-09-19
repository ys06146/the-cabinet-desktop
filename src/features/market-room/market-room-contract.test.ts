/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const marketRoomSource = readFileSync(new URL('./MarketRoom.tsx', import.meta.url), 'utf8');
const providerContractSource = readFileSync(
  new URL('../../providers/market/market-data-provider.ts', import.meta.url),
  'utf8',
);

describe('Market Room contracts', () => {
  it('includes the required research disclaimer verbatim', () => {
    expect(marketRoomSource).toContain(
      '시세는 제공처와 거래 시간에 따라 지연될 수 있습니다. 분석은 가격 데이터의 규칙 기반 계산이며 투자 권유 또는 매매 신호가 아닙니다.',
    );
  });

  it('keeps the market provider interface explicit and narrow', () => {
    expect(providerContractSource).toContain('getMarketSummary(): Promise<MarketSummary>');
    expect(providerContractSource).toContain('getWatchlist(): Promise<StockQuote[]>');
    expect(providerContractSource).toContain('getStockQuote(symbol: string): Promise<StockQuote>');
    expect(providerContractSource).toContain(
      'getHistoricalData(symbol: string, range: ChartRange): Promise<OHLCV[]>',
    );
  });
});
