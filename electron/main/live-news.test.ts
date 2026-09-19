import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyMarketResearchData,
  setSavedNews,
} from '../../src/domain/market-research-data';
import type { NewsFilter } from '../../src/domain/news';
import { LIVE_NEWS_FEEDS, LiveNewsProvider, parseNewsFeed } from './live-news';

const NOW = Date.parse('2026-09-19T12:00:00.000Z');
const DATE = 'Sat, 19 Sep 2026 10:00:00 GMT';
const feed = { region: 'domestic', category: 'economy' } as const;

function itemXml(options: {
  title?: string;
  source?: string;
  link?: string;
  date?: string;
} = {}): string {
  return '<item><title>' + (options.title ?? '시장 제목 - Test Press') +
    '</title><link>' + (options.link ?? 'https://news.google.com/rss/articles/CBMiexample?oc=5') +
    '</link><pubDate>' + (options.date ?? DATE) +
    '</pubDate><source url="https://publisher.example">' + (options.source ?? 'Test Press') +
    '</source><description>Do not invent or use this body.</description></item>';
}

function rss(items = itemXml()): string {
  return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>' +
    '<title>Google News</title>' + items + '</channel></rss>';
}

function responseForRegion(input: string | URL | Request): Response {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  return new Response(rss(itemXml({
    link: 'https://news.google.com/rss/articles/CBMi' + url.searchParams.get('gl'),
  })));
}

afterEach(() => vi.useRealTimers());

describe('live RSS parsing', () => {
  it('keeps verified headline metadata without inventing financial analysis', () => {
    const [item] = parseNewsFeed(rss(itemXml({
      title: 'A &amp; B &#xC2E4;&#xC801; - Test Press',
    })), feed, NOW);
    expect(item).toMatchObject({
      title: 'A & B 실적',
      outlet: 'Test Press',
      publishedAt: '2026-09-19T10:00:00.000Z',
      fetchedAt: '2026-09-19T12:00:00.000Z',
      articleUrl: 'https://news.google.com/rss/articles/CBMiexample',
      regions: ['domestic'],
      category: 'economy',
      source: 'google-news-rss',
      importance: 'unrated',
      sentiment: 'unrated',
      relatedSymbols: [],
      relatedThemes: [],
    });
    expect(item.summaryLines.join(' ')).not.toContain('Do not invent');
    expect(item.id).toMatch(/^rss-[a-f0-9]{32}$/);
    expect(setSavedNews(createEmptyMarketResearchData(), item.id, true).savedNewsIds).toEqual([item.id]);
  });

  it('handles CDATA, removes duplicate links, and produces IDs stable across refreshes', () => {
    const xml = rss(
      itemXml({ title: '<![CDATA[분기 실적 <잠정> - Test Press]]>' }) +
      itemXml({ link: 'https://news.google.com/rss/articles/CBMiexample?oc=3' }),
    );
    const first = parseNewsFeed(xml, feed, NOW);
    const second = parseNewsFeed(xml, feed, NOW + 1_000);
    expect(first).toHaveLength(1);
    expect(first[0].title).toBe('분기 실적 <잠정>');
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].fetchedAt).not.toBe(first[0].fetchedAt);
  });

  it('ignores invalid, stale, future-dated, or unsafe entries', () => {
    const xml = rss([
      itemXml(),
      itemXml({ title: '' }),
      itemXml({ source: '' }),
      itemXml({ date: 'invalid' }),
      itemXml({ date: 'Sat, 01 Aug 2026 10:00:00 GMT' }),
      itemXml({ date: 'Sun, 20 Sep 2026 10:00:00 GMT' }),
      itemXml({ link: 'javascript:alert(1)' }),
      itemXml({ link: 'https://news.google.com.attacker.example/rss/articles/CBMix' }),
      itemXml({ link: 'https://user:password@news.google.com/rss/articles/CBMix' }),
      itemXml({ link: 'https://news.google.com:444/rss/articles/CBMix' }),
      itemXml({ link: 'https://news.google.com/not-an-article' }),
      itemXml({ link: 'https://news.google.com/rss/articles/CBMix/../other' }),
    ].join(''));
    expect(parseNewsFeed(xml, feed, NOW)).toHaveLength(1);
  });

  it('rejects malformed XML, entity declarations, unexpected formats, and oversized feeds', () => {
    const invalid = [
      '<rss><channel></rss>',
      '<html><body>Temporarily unavailable</body></html>',
      '<!DOCTYPE rss [<!ENTITY secret SYSTEM "file:///private">]>' + rss(),
      '<!DOCTYPE rss><rss><channel/></rss>',
      rss(' '.repeat(1_000_001)),
    ];
    for (const xml of invalid) {
      expect(() => parseNewsFeed(xml, feed, NOW)).toThrow();
    }
    expect(parseNewsFeed(rss(''), feed, NOW)).toEqual([]);
  });

  it('sorts newest first before limiting each feed', () => {
    const items = Array.from({ length: 40 }, (_, index) => itemXml({
      link: 'https://news.google.com/rss/articles/CBMi' + index,
      date: new Date(NOW - (40 - index) * 60_000).toUTCString(),
    })).join('');
    const parsed = parseNewsFeed(rss(items), feed, NOW);
    expect(parsed).toHaveLength(30);
    expect(parsed[0].articleUrl).toContain('CBMi39');
    expect(parsed.at(-1)?.articleUrl).toContain('CBMi10');
  });
});

describe('LiveNewsProvider', () => {
  it('fetches only predefined endpoints for a valid filter and rejects arbitrary inputs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => responseForRegion(input));
    const provider = new LiveNewsProvider({ fetcher, now: () => NOW });
    const result = await provider.getNews('policy');
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.category === 'policy')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetcher.mock.calls) {
      expect(LIVE_NEWS_FEEDS.some((known) => known.url === url && known.category === 'policy')).toBe(true);
      expect(options?.redirect).toBe('error');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
    await expect(provider.getNews('https://attacker.example' as NewsFilter)).rejects.toThrow('필터');
    await expect(provider.getNews(null as unknown as NewsFilter)).rejects.toThrow('필터');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent fetches, caches for five minutes, and preserves receipt timestamps', async () => {
    let now = NOW;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => responseForRegion(input));
    const provider = new LiveNewsProvider({ fetcher, now: () => now });
    const [first, concurrent] = await Promise.all([provider.getNews('company'), provider.getNews('company')]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(concurrent).toEqual(first);
    first[0].title = 'mutated by a consumer';
    now += 299_999;
    const cached = await provider.getNews('company');
    expect(cached[0].title).not.toBe(first[0].title);
    expect(cached[0].fetchedAt).toBe(concurrent[0].fetchedAt);
    expect(fetcher).toHaveBeenCalledTimes(2);
    now += 1;
    const refreshed = await provider.getNews('company');
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(refreshed[0].id).toBe(cached[0].id);
    expect(refreshed[0].fetchedAt).not.toBe(cached[0].fetchedAt);
  });

  it('deduplicates across feeds while preserving both market regions', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(rss()));
    const provider = new LiveNewsProvider({ fetcher, now: () => NOW });
    const result = await provider.getNews('all');
    expect(fetcher).toHaveBeenCalledTimes(8);
    expect(result).toHaveLength(1);
    expect(result[0].regions).toEqual(['domestic', 'us']);
  });

  it('serves truthful details only for articles seen in this session, including prior refreshes', async () => {
    let now = NOW;
    let link = 'https://news.google.com/rss/articles/CBMiold';
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(rss(itemXml({ link }))));
    const provider = new LiveNewsProvider({ fetcher, now: () => now });
    const [original] = await provider.getNews('company');
    now += 300_001;
    link = 'https://news.google.com/rss/articles/CBMinew';
    await provider.getNews('company');
    const detail = await provider.getNewsDetail(original.id);
    expect(detail).toMatchObject({
      newsId: original.id,
      articleUrl: original.articleUrl,
      source: 'google-news-rss',
      directImpact: [],
      indirectImpact: [],
      counterPerspective: '',
    });
    expect(detail.summary).toContain('요약은 수집하지 않았습니다');
    await expect(provider.getNewsDetail('https://attacker.example')).rejects.toThrow('식별자');
    await expect(provider.getNewsDetail('rss-' + '0'.repeat(32))).rejects.toThrow('현재 세션');
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('surfaces HTTP failures and permits a fresh retry without replacing them with mock news', async () => {
    let fail = true;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      fail ? new Response('unavailable', { status: 503 }) : new Response(rss()));
    const provider = new LiveNewsProvider({ fetcher, now: () => NOW });
    await expect(provider.getNews('company')).rejects.toThrow('HTTP 503');
    fail = false;
    const result = await provider.getNews('company');
    expect(result[0].source).toBe('google-news-rss');
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('bounds response bytes even without a trustworthy content-length header', async () => {
    for (const headers of [undefined, { 'content-length': '1000001' }]) {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
        new Response('x'.repeat(1_000_001), { headers }));
      const provider = new LiveNewsProvider({ fetcher, now: () => NOW });
      await expect(provider.getNews('company')).rejects.toThrow('허용 크기');
    }
  });

  it('aborts stalled requests and reports a timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }));
    const provider = new LiveNewsProvider({ fetcher, now: () => NOW, timeoutMs: 500 });
    const rejection = expect(provider.getNews('company')).rejects.toThrow('시간이 초과');
    await vi.advanceTimersByTimeAsync(500);
    await rejection;
    expect(fetcher.mock.calls.every(([, options]) => options?.signal?.aborted)).toBe(true);
  });

  it('rejects invalid network XML instead of caching a successful empty result', async () => {
    let xml = '<rss><channel></rss>';
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(xml));
    const provider = new LiveNewsProvider({ fetcher, now: () => NOW });
    await expect(provider.getNews('company')).rejects.toThrow('형식');
    xml = rss();
    expect(await provider.getNews('company')).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
