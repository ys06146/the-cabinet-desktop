import { describe, expect, it, vi } from 'vitest';
import { LiveMarketDataProvider } from './live-market-data';

const TRADE_TIME = '2026-09-18T06:30:23.000Z';
const NOW = Date.parse('2026-09-19T10:00:00.000Z');

function yahoo(symbol = 'AAPL', options: { previous?: number; close?: number } = {}) {
  const price = options.close ?? 336.13;
  return {
    chart: {
      error: null,
      result: [{
        meta: {
          symbol, currency: symbol.endsWith('.KS') ? 'KRW' : 'USD',
          regularMarketPrice: price, previousClose: options.previous ?? 337,
          chartPreviousClose: 100, regularMarketTime: Date.parse(TRADE_TIME) / 1000,
          regularMarketVolume: 86588203,
          currentTradingPeriod: { regular: { start: NOW / 1000 - 86400, end: NOW / 1000 - 80000 } },
        },
        timestamp: [1789712400, 1789712700, 1789713000],
        indicators: { quote: [{
          open: [335, null, 336], high: [337, null, 337],
          low: [334, null, 335], close: [336, null, price], volume: [100, null, 200],
        }] },
      }],
    },
  };
}

function naver() {
  return {
    pollingInterval: 70000,
    datas: [{
      itemCode: '005930', closePriceRaw: '260000', compareToPreviousClosePriceRaw: '7500',
      compareToPreviousPrice: { code: '2' }, accumulatedTradingVolumeRaw: '15042569',
      stockExchangeType: { delayTime: 0 }, localTradedAt: '2026-09-18T20:00:00+09:00',
      marketStatus: 'CLOSE', marketSessionType: 'afterMarket',
    }],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('LiveMarketDataProvider', () => {
  it('uses domestic actual prices and provider time, preserves after-market session and cache fetch time', async () => {
    let now = NOW;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(naver()));
    const provider = new LiveMarketDataProvider({ fetch, now: () => now });
    const quote = await provider.getStockQuote('005930.KS');
    expect(quote).toMatchObject({
      price: 260000, previousClose: 252500, change: 7500,
      source: 'naver', delayMinutes: 0, marketState: 'closed', session: 'post',
      updatedAt: '2026-09-18T11:00:00.000Z', fetchedAt: new Date(NOW).toISOString(),
    });
    now += 30_000;
    expect(await provider.getStockQuote('005930.KS')).toEqual(quote);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 41_000;
    expect((await provider.getStockQuote('005930.KS')).fetchedAt).toBe(new Date(now).toISOString());
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates simultaneous domestic requests and normalizes unsigned falling changes', async () => {
    const body = naver();
    body.datas[0].compareToPreviousPrice.code = '5';
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(body));
    const provider = new LiveMarketDataProvider({ fetch, now: () => NOW });
    const [first, second] = await Promise.all([
      provider.getStockQuote('005930.KS'), provider.getStockQuote('005930.KS'),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.change).toBe(-7500);
    expect(first.previousClose).toBe(267500);
    expect(second).toEqual(first);
  });

  it('falls back to an explicitly delayed real quote when the domestic source fails', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) => {
      if (String(url).includes('naver.com')) return json({}, 503);
      const body = yahoo('005930.KS', { close: 261000, previous: 252500 });
      const series = body.chart.result[0].indicators.quote[0];
      series.high = [270000, null, 270000];
      return json(body);
    });
    const provider = new LiveMarketDataProvider({ fetch, now: () => NOW });
    const quote = await provider.getStockQuote('005930.KS');
    expect(quote).toMatchObject({ price: 261000, source: 'yahoo', delayMinutes: 20, session: 'regular' });
  });

  it('uses previous close from the one-day response rather than a chart range baseline', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(yahoo()));
    const provider = new LiveMarketDataProvider({ fetch, now: () => NOW });
    const quote = await provider.getStockQuote('AAPL');
    expect(quote).toMatchObject({
      source: 'yahoo', previousClose: 337, updatedAt: TRADE_TIME, marketState: 'closed',
    });
    expect(quote.change).toBeCloseTo(-0.87);
    expect(String(fetch.mock.calls[0][0])).toContain('range=1d');
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit' });
  });

  it('does not refetch a successful US quote within one minute and refreshes it after expiration', async () => {
    let now = NOW;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(yahoo()));
    const provider = new LiveMarketDataProvider({ fetch, now: () => now });
    const first = await provider.getStockQuote('AAPL');
    now += 59_999;
    expect(await provider.getStockQuote('AAPL')).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 1;
    const refreshed = await provider.getStockQuote('AAPL');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(refreshed.fetchedAt).toBe(new Date(now).toISOString());
    expect(refreshed.updatedAt).toBe(first.updatedAt);
  });

  it('validates symbols and ranges before making a network request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const provider = new LiveMarketDataProvider({ fetch });
    await expect(provider.getStockQuote('../../private')).rejects.toThrow('지원하지 않는 종목');
    await expect(provider.getHistoricalData('AAPL', 'all' as '1D')).rejects.toThrow('지원하지 않는 차트 기간');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips unavailable bars, returns ordered real OHLCV and refreshes daily history after one minute', async () => {
    let now = NOW;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(yahoo()));
    const provider = new LiveMarketDataProvider({ fetch, now: () => now });
    const first = await provider.getHistoricalData('AAPL', '1Y');
    expect(first).toHaveLength(2);
    expect(first[1]).toMatchObject({ close: 336.13, volume: 200, timestamp: 1789713000000 });
    now += 59_000;
    expect(await provider.getHistoricalData('AAPL', '1Y')).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 1_001;
    await provider.getHistoricalData('AAPL', '1Y');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0][0])).toContain('interval=1d&range=1y');
  });

  it('rejects malformed price data rather than creating simulated values', async () => {
    const body = yahoo();
    body.chart.result[0].meta.regularMarketPrice = NaN;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(body));
    const provider = new LiveMarketDataProvider({ fetch });
    await expect(provider.getStockQuote('AAPL')).rejects.toThrow('현재가');
  });

  it('rejects a mismatched provider symbol and impossible OHLC bars', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(yahoo('MSFT')));
    await expect(new LiveMarketDataProvider({ fetch }).getHistoricalData('AAPL', '1D'))
      .rejects.toThrow('종목이 요청과 다릅니다');
    const body = yahoo();
    body.chart.result[0].indicators.quote[0].high[0] = 300;
    fetch.mockImplementation(async () => json(body));
    await expect(new LiveMarketDataProvider({ fetch }).getHistoricalData('AAPL', '1D'))
      .rejects.toThrow('가격 범위');
  });

  it('keeps supported real summary items when one source series is unavailable; never includes mock fear/greed', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) => {
      const symbol = decodeURIComponent(new URL(String(url)).pathname.split('/').at(-1)!);
      if (symbol === '^VIX') return json({}, 404);
      return json(yahoo(symbol));
    });
    const summary = await new LiveMarketDataProvider({ fetch, now: () => NOW }).getMarketSummary();
    expect(summary.items).toHaveLength(6);
    expect(summary.items.some((item) => item.id === 'fear-greed')).toBe(false);
    expect(summary.items.every((item) => item.source === 'yahoo')).toBe(true);
    expect(summary.items.find((item) => item.id === 'kospi')?.delayMinutes).toBe(20);
    expect(summary.updatedAt).toBe(TRADE_TIME);
  });

  it('surfaces network failures and allows a fresh retry', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockImplementationOnce(async () => json(yahoo()));
    const provider = new LiveMarketDataProvider({ fetch });
    await expect(provider.getStockQuote('AAPL')).rejects.toThrow('Network unavailable');
    expect((await provider.getStockQuote('AAPL')).price).toBe(336.13);
  });

  it('keeps other stock quotes when one US symbol is unavailable', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) => {
      if (String(url).includes('naver.com')) return json(naver());
      const symbol = decodeURIComponent(new URL(String(url)).pathname.split('/').at(-1)!);
      if (symbol === 'AAPL') return json({}, 503);
      return json(yahoo(symbol));
    });
    const quotes = await new LiveMarketDataProvider({ fetch, now: () => NOW }).getWatchlist();
    expect(quotes).toHaveLength(10);
    expect(quotes.find((quote) => quote.symbol === '005930.KS')?.price).toBe(260000);
    expect(quotes.some((quote) => quote.symbol === 'AAPL')).toBe(false);
  });

  it('reports an unavailable watchlist when every real source fails', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json({}, 503));
    await expect(new LiveMarketDataProvider({ fetch }).getWatchlist()).rejects.toThrow('종목 시세를 불러오지 못했습니다');
  });

  it('times out the whole response and rejects oversized bodies', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    await expect(new LiveMarketDataProvider({ fetch, timeoutMs: 5 }).getStockQuote('AAPL'))
      .rejects.toThrow('시간이 초과');
    fetch.mockImplementation(async () => new Response('x', { headers: { 'content-length': '2000001' } }));
    await expect(new LiveMarketDataProvider({ fetch }).getStockQuote('AAPL'))
      .rejects.toThrow('응답이 너무 큽니다');
  });
});
