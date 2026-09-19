import {
  CHART_RANGES,
  type ChartRange,
  type MarketState,
  type MarketSummary,
  type MarketSummaryId,
  type MarketSummaryItem,
  type OHLCV,
  type StockQuote,
} from '../../src/domain/market';
import { getMarketStock, MARKET_STOCKS, type MarketStock } from '../../src/domain/market-catalog';
import type { MarketDataProvider } from '../../src/providers/market/market-data-provider';

type JsonObject = Record<string, unknown>;
type MarketFetch = typeof globalThis.fetch;
interface ResponseData { body: unknown; fetchedAt: string }
interface CachedResponse { result: ResponseData; expiresAt: number }
interface ChartData { meta: JsonObject; candles: OHLCV[]; fetchedAt: string }

const QUOTE_TTL = 60_000;
const HISTORY_TTL = QUOTE_TTL;
const MAX_RESPONSE_BYTES = 2_000_000;
const YAHOO_ORIGIN = 'https://query1.finance.yahoo.com';
const NAVER_ORIGIN = 'https://polling.finance.naver.com';

const HISTORY_REQUESTS: Record<ChartRange, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '60m' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
};

const INDICES: readonly { symbol: string; id: MarketSummaryId; label: string; delay: number }[] = [
  { symbol: '^KS11', id: 'kospi', label: 'KOSPI', delay: 20 },
  { symbol: '^KQ11', id: 'kosdaq', label: 'KOSDAQ', delay: 20 },
  { symbol: '^GSPC', id: 'sp500', label: 'S&P 500', delay: 0 },
  { symbol: '^IXIC', id: 'nasdaq', label: 'NASDAQ', delay: 0 },
  { symbol: '^DJI', id: 'dow-jones', label: 'Dow Jones', delay: 0 },
  { symbol: 'KRW=X', id: 'usd-krw', label: 'USD/KRW', delay: 0 },
  { symbol: '^VIX', id: 'volatility', label: 'VIX', delay: 15 },
];

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('시세 제공처의 응답 형식을 확인할 수 없습니다.');
  }
  return value as JsonObject;
}

function finite(value: unknown, label: string, minimum = -Infinity): number {
  const number = typeof value === 'number' ? value
    : typeof value === 'string' && /^-?\d+(?:,\d{3})*(?:\.\d+)?$/.test(value)
      ? Number(value.replaceAll(',', '')) : NaN;
  if (!Number.isFinite(number) || number < minimum) {
    throw new Error('시세 제공처의 ' + label + ' 값이 올바르지 않습니다.');
  }
  return number;
}

function isoTime(value: unknown): string {
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) throw new Error('시세 기준 시각을 확인할 수 없습니다.');
  return new Date(timestamp).toISOString();
}

function yahooTime(meta: JsonObject): string {
  const seconds = finite(meta.regularMarketTime, '기준 시각', 1);
  return new Date(seconds * 1_000).toISOString();
}

function yahooMarketState(meta: JsonObject, now: number): MarketState {
  const periods = meta.currentTradingPeriod;
  if (!periods || typeof periods !== 'object') return 'unknown';
  const regular = (periods as JsonObject).regular;
  if (!regular || typeof regular !== 'object') return 'unknown';
  const { start, end } = regular as JsonObject;
  if (typeof start !== 'number' || typeof end !== 'number') return 'unknown';
  return now >= start * 1_000 && now < end * 1_000 ? 'open' : 'closed';
}

function previousClose(meta: JsonObject): number {
  // This function is only used with a one-day chart: chartPreviousClose in
  // longer chart ranges is the start of that range, not yesterday's close.
  return finite(meta.previousClose ?? meta.chartPreviousClose, '전일 종가', Number.MIN_VALUE);
}

export interface LiveMarketDataOptions {
  fetch?: MarketFetch;
  now?: () => number;
  timeoutMs?: number;
}

/** Public website feeds are best-effort. Errors never silently substitute mock prices. */
export class LiveMarketDataProvider implements MarketDataProvider {
  private readonly fetch: MarketFetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly cache = new Map<string, CachedResponse>();
  private readonly inFlight = new Map<string, Promise<ResponseData>>();

  constructor(options: LiveMarketDataOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  private request(url: string, ttl: number): Promise<ResponseData> {
    const parsed = new URL(url);
    if (![YAHOO_ORIGIN, NAVER_ORIGIN].includes(parsed.origin)) {
      return Promise.reject(new Error('허용되지 않은 시세 제공처입니다.'));
    }
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > this.now()) return Promise.resolve(cached.result);
    const pending = this.inFlight.get(url);
    if (pending) return pending;

    const task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetch(url, {
          signal: controller.signal,
          redirect: 'error',
          credentials: 'omit',
          headers: { Accept: 'application/json', 'User-Agent': 'The-Cabinet/market-data' },
        });
        if (!response.ok) throw new Error('시세 연결 오류 (HTTP ' + response.status + ').');
        const declaredLength = Number(response.headers.get('content-length') ?? '0');
        if (declaredLength > MAX_RESPONSE_BYTES) throw new Error('시세 응답이 너무 큽니다.');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('시세 응답이 비어 있습니다.');
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new Error('시세 응답이 너무 큽니다.');
          }
          chunks.push(chunk.value);
        }
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const result = { body, fetchedAt: new Date(this.now()).toISOString() };
        const interval = parsed.origin === NAVER_ORIGIN && body && typeof body === 'object'
          ? (body as JsonObject).pollingInterval : undefined;
        const cacheTtl = typeof interval === 'number' && Number.isFinite(interval)
          ? Math.max(ttl, Math.min(interval, 300_000)) : ttl;
        this.cache.set(url, { result, expiresAt: this.now() + cacheTtl });
        return result;
      } catch (error) {
        if (controller.signal.aborted) throw new Error('시세 요청 시간이 초과되었습니다. 다시 시도해 주세요.', { cause: error });
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();
    this.inFlight.set(url, task);
    void task.finally(() => this.inFlight.delete(url)).catch(() => {});
    return task;
  }

  private async chart(symbol: string, range: string, interval: string): Promise<ChartData> {
    const url = YAHOO_ORIGIN + '/v8/finance/chart/' + encodeURIComponent(symbol)
      + '?interval=' + interval + '&range=' + range + '&includePrePost=false';
    const response = await this.request(url, interval === '1d' ? HISTORY_TTL : QUOTE_TTL);
    const chart = object(object(response.body).chart);
    if (chart.error || !Array.isArray(chart.result) || chart.result.length !== 1) {
      throw new Error('이 종목의 차트 데이터를 제공처에서 받지 못했습니다.');
    }
    const result = object(chart.result[0]);
    const meta = object(result.meta);
    if (meta.symbol !== symbol) throw new Error('시세 응답의 종목이 요청과 다릅니다.');
    const quoteSeries = object(result.indicators).quote;
    if (!Array.isArray(quoteSeries) || quoteSeries.length === 0 || !Array.isArray(result.timestamp)) {
      throw new Error('시세 차트 데이터가 비어 있습니다.');
    }
    const quote = object(quoteSeries[0]);
    const names = ['open', 'high', 'low', 'close', 'volume'] as const;
    for (const name of names) {
      if (!Array.isArray(quote[name])) throw new Error('시세 차트 배열이 올바르지 않습니다.');
    }
    const candles: OHLCV[] = [];
    for (let index = 0; index < result.timestamp.length; index += 1) {
      const raw = names.map((name) => (quote[name] as unknown[])[index]);
      // Exchanges can publish null bars during halts or outside the session.
      if (raw.some((value) => value === null || value === undefined)) continue;
      const [open, high, low, close, volume] = raw.map((value) => finite(value, '차트', 0));
      const timestamp = finite(result.timestamp[index], '차트 시각', 1) * 1_000;
      if (open <= 0 || close <= 0 || low <= 0 || high < Math.max(open, close)
        || low > Math.min(open, close) || high < low) {
        throw new Error('시세 차트의 가격 범위가 올바르지 않습니다.');
      }
      if (candles.length && timestamp <= candles[candles.length - 1].timestamp) continue;
      candles.push({ timestamp, open, high, low, close, volume });
    }
    if (!candles.length) throw new Error('사용 가능한 차트 데이터가 없습니다.');
    return { meta, candles, fetchedAt: response.fetchedAt };
  }

  private async naverQuote(stock: MarketStock): Promise<StockQuote> {
    const domestic = MARKET_STOCKS.filter((entry) => entry.region === 'domestic');
    const codes = domestic.map((entry) => entry.symbol.split('.')[0]).join(',');
    const response = await this.request(NAVER_ORIGIN + '/api/realtime/domestic/stock/' + codes, QUOTE_TTL);
    const body = object(response.body);
    if (!Array.isArray(body.datas)) throw new Error('국내 시세 응답이 비어 있습니다.');
    const code = stock.symbol.split('.')[0];
    const raw = body.datas.find((entry: unknown) => object(entry).itemCode === code);
    const quote = object(raw);
    const price = finite(quote.closePriceRaw ?? quote.closePrice, '현재가', Number.MIN_VALUE);
    const rawChange = finite(quote.compareToPreviousClosePriceRaw ?? quote.compareToPreviousClosePrice, '등락');
    const direction = object(quote.compareToPreviousPrice).code;
    const change = direction === '4' || direction === '5' ? -Math.abs(rawChange)
      : direction === '1' || direction === '2' ? Math.abs(rawChange) : rawChange;
    const previous = price - change;
    if (previous <= 0) throw new Error('전일 종가를 확인할 수 없습니다.');
    const exchange = object(quote.stockExchangeType);
    const delayMinutes = finite(exchange.delayTime, '지연 시간', 0);
    const session = quote.marketSessionType === 'afterMarket' ? 'post'
      : quote.marketSessionType === 'preMarket' ? 'pre' : 'regular';
    const marketState: MarketState = quote.marketStatus === 'OPEN'
      ? session === 'regular' ? 'open' : session
      : quote.marketStatus === 'CLOSE' ? 'closed' : 'unknown';
    return {
      ...stock, price, previousClose: previous, change,
      changePercent: change / previous * 100,
      volume: finite(quote.accumulatedTradingVolumeRaw ?? quote.accumulatedTradingVolume, '거래량', 0),
      source: 'naver', updatedAt: isoTime(quote.localTradedAt), fetchedAt: response.fetchedAt,
      delayMinutes, marketState, session,
    };
  }

  private async yahooQuote(stock: MarketStock): Promise<StockQuote> {
    const { meta, fetchedAt } = await this.chart(stock.symbol, '1d', '5m');
    if (meta.currency !== stock.currency) throw new Error('시세의 통화가 요청과 다릅니다.');
    const price = finite(meta.regularMarketPrice, '현재가', Number.MIN_VALUE);
    const previous = previousClose(meta);
    return {
      ...stock, price, previousClose: previous, change: price - previous,
      changePercent: (price - previous) / previous * 100,
      volume: finite(meta.regularMarketVolume, '거래량', 0),
      source: 'yahoo', updatedAt: yahooTime(meta), fetchedAt,
      delayMinutes: stock.region === 'domestic' ? 20 : 0,
      marketState: yahooMarketState(meta, this.now()), session: 'regular',
    };
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    const stock = getMarketStock(symbol);
    if (stock.region === 'domestic') {
      try { return await this.naverQuote(stock); } catch { /* Fall back to a labeled delayed real quote. */ }
    }
    return this.yahooQuote(stock);
  }

  async getWatchlist(): Promise<StockQuote[]> {
    const results = await Promise.allSettled(MARKET_STOCKS.map((stock) => this.getStockQuote(stock.symbol)));
    const quotes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    if (!quotes.length) throw new Error('종목 시세를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
    return quotes;
  }

  async getHistoricalData(symbol: string, range: ChartRange): Promise<OHLCV[]> {
    getMarketStock(symbol);
    if (!CHART_RANGES.includes(range)) throw new Error('지원하지 않는 차트 기간입니다.');
    const request = HISTORY_REQUESTS[range];
    return (await this.chart(symbol, request.range, request.interval)).candles;
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const results = await Promise.allSettled(INDICES.map(async (index): Promise<MarketSummaryItem> => {
      const chart = await this.chart(index.symbol, '1d', '5m');
      const value = finite(chart.meta.regularMarketPrice, '지수', Number.MIN_VALUE);
      const previous = previousClose(chart.meta);
      return {
        id: index.id, label: index.label, value, changePercent: (value - previous) / previous * 100,
        unit: index.id === 'usd-krw' ? 'exchange-rate' : 'index',
        sparkline: chart.candles.map((candle) => ({ timestamp: candle.timestamp, value: candle.close })),
        source: 'yahoo', updatedAt: yahooTime(chart.meta), fetchedAt: chart.fetchedAt,
        delayMinutes: index.delay, marketState: yahooMarketState(chart.meta, this.now()),
      };
    }));
    const items = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    if (!items.length) throw new Error('시장 지수를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
    return {
      items, source: 'yahoo',
      warnings: results.flatMap((result, index) => result.status === 'rejected'
        ? [INDICES[index].label + ' 지수를 조회하지 못했습니다.'] : []),
      updatedAt: items.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, ''),
      fetchedAt: items.reduce((latest, item) => (item.fetchedAt ?? '') > latest ? item.fetchedAt! : latest, ''),
    };
  }
}
