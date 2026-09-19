import type { IpcMainInvokeEvent } from 'electron';
import { CHART_RANGES, type ChartRange } from '../../src/domain/market';
import { NEWS_FILTERS, type NewsFilter } from '../../src/domain/news';
import type { MarketDataProvider } from '../../src/providers/market/market-data-provider';
import type { NewsProvider } from '../../src/providers/news/news-provider';
import { IPC_CHANNELS } from '../shared/ipc';

export interface MarketDataIpcRegistrar {
  handle: (channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => void;
}

function symbolArgument(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:[0-9]{6}\.K[QS]|[A-Z]{1,6})$/.test(value)) {
    throw new TypeError('지원하지 않는 종목입니다.');
  }
  return value;
}

function rangeArgument(value: unknown): ChartRange {
  if (typeof value !== 'string' || !CHART_RANGES.includes(value as ChartRange)) {
    throw new TypeError('지원하지 않는 차트 기간입니다.');
  }
  return value as ChartRange;
}

function filterArgument(value: unknown): NewsFilter {
  if (typeof value !== 'string' || !NEWS_FILTERS.includes(value as NewsFilter)) {
    throw new TypeError('지원하지 않는 뉴스 필터입니다.');
  }
  return value as NewsFilter;
}

function newsIdArgument(value: unknown): string {
  if (typeof value !== 'string' || !/^rss-[a-f0-9]{32}$/.test(value)) {
    throw new TypeError('뉴스 식별자가 올바르지 않습니다.');
  }
  return value;
}

export function validateNewsArticleUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) {
    throw new TypeError('기사 링크가 올바르지 않습니다.');
  }
  const url = new URL(value);
  if (
    url.protocol !== 'https:' || url.hostname !== 'news.google.com' ||
    url.port || url.username || url.password || url.search || url.hash ||
    !/^\/rss\/articles\/[A-Za-z0-9_-]+$/.test(url.pathname)
  ) {
    throw new TypeError('허용되지 않은 기사 링크입니다.');
  }
  return url.href;
}

export function registerMarketDataIpcHandlers(
  registrar: MarketDataIpcRegistrar,
  assertTrusted: (event: IpcMainInvokeEvent) => void,
  market: MarketDataProvider,
  news: NewsProvider,
  openExternal: (url: string) => Promise<void>,
): void {
  registrar.handle(IPC_CHANNELS.getMarketSummary, (event) => {
    assertTrusted(event);
    return market.getMarketSummary();
  });
  registrar.handle(IPC_CHANNELS.getWatchlist, (event) => {
    assertTrusted(event);
    return market.getWatchlist();
  });
  registrar.handle(IPC_CHANNELS.getStockQuote, (event, symbol) => {
    assertTrusted(event);
    return market.getStockQuote(symbolArgument(symbol));
  });
  registrar.handle(IPC_CHANNELS.getHistoricalData, (event, symbol, range) => {
    assertTrusted(event);
    return market.getHistoricalData(symbolArgument(symbol), rangeArgument(range));
  });
  registrar.handle(IPC_CHANNELS.getNews, (event, filter) => {
    assertTrusted(event);
    return news.getNews(filterArgument(filter));
  });
  registrar.handle(IPC_CHANNELS.getNewsDetail, (event, newsId) => {
    assertTrusted(event);
    return news.getNewsDetail(newsIdArgument(newsId));
  });
  registrar.handle(IPC_CHANNELS.openNewsArticle, async (event, newsId) => {
    assertTrusted(event);
    const detail = await news.getNewsDetail(newsIdArgument(newsId));
    await openExternal(validateNewsArticleUrl(detail.articleUrl));
  });
}
