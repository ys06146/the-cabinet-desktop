import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../../src/providers/market/market-data-provider';
import type { NewsProvider } from '../../src/providers/news/news-provider';
import { IPC_CHANNELS } from '../shared/ipc';
import { registerMarketDataIpcHandlers, validateNewsArticleUrl } from './market-data-ipc';

const newsId = 'rss-' + 'a'.repeat(32);
function fixture(deny = false) {
  const handlers = new Map<string, (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown>();
  const market = {
    getMarketSummary: vi.fn(), getWatchlist: vi.fn(),
    getStockQuote: vi.fn(), getHistoricalData: vi.fn(),
  };
  const news = { getNews: vi.fn(), getNewsDetail: vi.fn(async () => ({
    articleUrl: 'https://news.google.com/rss/articles/ABC_123-xyz',
  })) };
  const guard = vi.fn(() => { if (deny) throw new Error('Untrusted IPC sender'); });
  const open = vi.fn(async () => {});
  registerMarketDataIpcHandlers(
    { handle: (channel, handler) => { handlers.set(channel, handler); } },
    guard, market as MarketDataProvider, news as unknown as NewsProvider, open,
  );
  const invoke = (channel: string, ...args: unknown[]) =>
    handlers.get(channel)!({} as IpcMainInvokeEvent, ...args);
  return { handlers, market, news, guard, open, invoke };
}

describe('market data IPC boundary', () => {
  it('blocks untrusted senders before any provider or external browser call', async () => {
    const { handlers, invoke, market, news, open } = fixture(true);
    for (const channel of handlers.keys()) {
      await expect(Promise.resolve().then(() => invoke(channel, newsId))).rejects.toThrow('Untrusted');
    }
    for (const method of [...Object.values(market), ...Object.values(news), open]) {
      expect(method).not.toHaveBeenCalled();
    }
  });

  it('validates renderer arguments before using providers', async () => {
    const { invoke, market, news, open } = fixture();
    for (const symbol of ['https://evil.test', '../secrets', 'AAPL?x=1', null]) {
      expect(() => invoke(IPC_CHANNELS.getStockQuote, symbol)).toThrow();
    }
    expect(() => invoke(IPC_CHANNELS.getHistoricalData, 'AAPL', 'forever')).toThrow();
    expect(() => invoke(IPC_CHANNELS.getNews, 'https://evil.test')).toThrow();
    expect(() => invoke(IPC_CHANNELS.getNewsDetail, '../id')).toThrow();
    await expect(invoke(IPC_CHANNELS.openNewsArticle, 'https://evil.test')).rejects.toThrow();
    expect(market.getStockQuote).not.toHaveBeenCalled();
    expect(market.getHistoricalData).not.toHaveBeenCalled();
    expect(news.getNews).not.toHaveBeenCalled();
    expect(news.getNewsDetail).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens only the cached article resolved by id', async () => {
    const { invoke, news, open } = fixture();
    await invoke(IPC_CHANNELS.openNewsArticle, newsId);
    expect(news.getNewsDetail).toHaveBeenCalledWith(newsId);
    expect(open).toHaveBeenCalledWith('https://news.google.com/rss/articles/ABC_123-xyz');
    news.getNewsDetail.mockResolvedValueOnce({ articleUrl: 'file:///C:/Windows/system32/cmd.exe' });
    await expect(invoke(IPC_CHANNELS.openNewsArticle, newsId)).rejects.toThrow();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('rejects non-article URLs, credentials, alternate protocols and redirect queries', () => {
    for (const url of [
      'http://news.google.com/rss/articles/ABC',
      'https://news.google.com.evil.test/rss/articles/ABC',
      'https://user@news.google.com/rss/articles/ABC',
      'https://news.google.com:123/rss/articles/ABC',
      'https://news.google.com/rss/articles/ABC?url=https://evil.test',
      'https://news.google.com/rss/articles/ABC#hash',
      'https://news.google.com/',
      'javascript:alert(1)',
    ]) expect(() => validateNewsArticleUrl(url)).toThrow();
  });
});
