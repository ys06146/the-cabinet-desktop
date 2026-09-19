import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { MarketRegion } from '../../src/domain/market';
import {
  NEWS_FILTERS,
  type NewsCategory,
  type NewsDetail,
  type NewsFilter,
  type NewsItem,
} from '../../src/domain/news';
import type { NewsProvider } from '../../src/providers/news/news-provider';

const CACHE_TTL_MS = 300_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_FEED_BYTES = 1_000_000;
const MAX_FEED_ITEMS = 30;
const MAX_RESULT_ITEMS = 100;
const MAX_RECENT_ITEMS = 500;
const MAX_NEWS_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export interface NewsFeed {
  readonly region: MarketRegion;
  readonly category: NewsCategory;
  readonly url: string;
}

const queries: Record<MarketRegion, Record<NewsCategory, string>> = {
  domestic: {
    company: '한국 기업 실적 주식',
    industry: '한국 반도체 자동차 산업',
    economy: '코스피 OR 코스닥 OR 한국 증시',
    policy: '한국은행 금리 OR 한국 금융 정책',
  },
  us: {
    company: 'US corporate earnings',
    industry: 'US technology sector OR US energy sector',
    economy: 'US stock market OR S&P 500 OR Nasdaq',
    policy: 'Federal Reserve interest rates OR US trade policy',
  },
};

export const LIVE_NEWS_FEEDS: readonly NewsFeed[] = Object.freeze(
  (['domestic', 'us'] as const).flatMap((region) =>
    (['company', 'industry', 'economy', 'policy'] as const).map((category) => {
      const params = new URLSearchParams({
        q: queries[region][category] + ' when:7d',
        hl: region === 'domestic' ? 'ko' : 'en-US',
        gl: region === 'domestic' ? 'KR' : 'US',
        ceid: region === 'domestic' ? 'KR:ko' : 'US:en',
      });
      return Object.freeze({
        region,
        category,
        url: 'https://news.google.com/rss/search?' + params.toString(),
      });
    }),
  ),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function articleUrl(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 4_096 ||
    !/^https:\/\/news\.google\.com\/rss\/articles\/[A-Za-z0-9_-]+(?:\?[^#\s]*)?$/.test(value)
  ) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'news.google.com' ||
      url.port !== '' ||
      url.username !== '' ||
      url.password !== '' ||
      !/^\/rss\/articles\/[A-Za-z0-9_-]+$/.test(url.pathname)
    ) {
      return null;
    }
    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

export function parseNewsFeed(
  xml: string,
  feed: Pick<NewsFeed, 'region' | 'category'>,
  fetchedAt: number = Date.now(),
): NewsItem[] {
  if (
    Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES ||
    /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  ) {
    throw new Error('뉴스 피드 형식이 올바르지 않습니다.');
  }

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    processEntities: true,
    htmlEntities: true,
    isArray: (_name, path) => path === 'rss.channel.item',
  });
  const document: unknown = parser.parse(xml);
  if (!isRecord(document) || !isRecord(document.rss) || !isRecord(document.rss.channel)) {
    throw new Error('뉴스 피드에 RSS 채널이 없습니다.');
  }
  const candidates: unknown = document.rss.channel.item;
  if (candidates === undefined) return [];
  if (!Array.isArray(candidates)) throw new Error('뉴스 기사 목록 형식이 올바르지 않습니다.');

  const items = new Map<string, NewsItem>();
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const rawTitle = text(candidate.title, 1_000);
    const outlet = text(candidate.source, 200);
    const url = articleUrl(candidate.link);
    const rawDate = text(candidate.pubDate, 100);
    if (!rawTitle || !outlet || !url || !rawDate) continue;
    const timestamp = Date.parse(rawDate);
    if (
      !Number.isFinite(timestamp) ||
      timestamp < fetchedAt - MAX_NEWS_AGE_MS ||
      timestamp > fetchedAt + 5 * 60 * 1_000
    ) {
      continue;
    }
    const suffix = ' - ' + outlet;
    const title = rawTitle.endsWith(suffix)
      ? rawTitle.slice(0, -suffix.length).trim()
      : rawTitle;
    if (!title) continue;
    const id = 'rss-' + createHash('sha256').update(url).digest('hex').slice(0, 32);
    const item: NewsItem = {
      id,
      title,
      outlet,
      publishedAt: new Date(timestamp).toISOString(),
      fetchedAt: new Date(fetchedAt).toISOString(),
      articleUrl: url,
      regions: [feed.region],
      category: feed.category,
      relatedSymbols: [],
      relatedThemes: [],
      importance: 'unrated',
      sentiment: 'unrated',
      summaryLines: ['출처: ' + outlet + ' · Google News RSS', '기사 원문에서 내용을 확인하세요.'],
      isSaved: false,
      source: 'google-news-rss',
    };
    const previous = items.get(id);
    if (!previous || item.publishedAt > previous.publishedAt) items.set(id, item);
  }
  return [...items.values()]
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id))
    .slice(0, MAX_FEED_ITEMS);
}

async function readBoundedResponse(response: Response): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw new Error('뉴스 피드가 허용 크기를 초과했습니다.');
  }
  if (!response.body) throw new Error('뉴스 피드 응답이 비어 있습니다.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error('뉴스 피드가 허용 크기를 초과했습니다.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

interface LiveNewsProviderOptions {
  fetcher?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

export class LiveNewsProvider implements NewsProvider {
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly cache = new Map<string, { expiresAt: number; items: NewsItem[] }>();
  private readonly inFlight = new Map<string, Promise<NewsItem[]>>();
  private readonly recentItems = new Map<string, NewsItem>();

  constructor(options: LiveNewsProviderOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  async getNews(filter: NewsFilter): Promise<NewsItem[]> {
    if (typeof filter !== 'string' || !(NEWS_FILTERS as readonly string[]).includes(filter)) {
      throw new Error('지원하지 않는 뉴스 필터입니다.');
    }
    const feeds = LIVE_NEWS_FEEDS.filter(
      (feed) => filter === 'all' || filter === feed.region || filter === feed.category,
    );
    const results = await Promise.all(feeds.map((feed) => this.loadFeed(feed)));
    const deduplicated = new Map<string, NewsItem>();
    for (const item of results.flat()) {
      const previous = deduplicated.get(item.id);
      if (previous) {
        const newer = item.publishedAt > previous.publishedAt ? item : previous;
        deduplicated.set(item.id, {
          ...newer,
          regions: [...new Set([...previous.regions, ...item.regions])],
        });
      } else {
        deduplicated.set(item.id, item);
      }
    }
    const items = [...deduplicated.values()]
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id))
      .slice(0, MAX_RESULT_ITEMS);
    for (const item of items) {
      this.recentItems.delete(item.id);
      this.recentItems.set(item.id, item);
    }
    while (this.recentItems.size > MAX_RECENT_ITEMS) {
      const oldestId = this.recentItems.keys().next().value;
      if (oldestId !== undefined) this.recentItems.delete(oldestId);
    }
    return structuredClone(items);
  }

  async getNewsDetail(newsId: string): Promise<NewsDetail> {
    if (typeof newsId !== 'string' || !/^rss-[a-f0-9]{32}$/.test(newsId)) {
      throw new Error('올바르지 않은 뉴스 식별자입니다.');
    }
    const item = this.recentItems.get(newsId);
    if (!item) {
      throw new Error('현재 세션에서 확인한 기사가 아닙니다. 뉴스 목록을 새로고침해 주세요.');
    }
    return {
      newsId: item.id,
      title: item.title,
      outlet: item.outlet,
      publishedAt: item.publishedAt,
      fetchedAt: item.fetchedAt,
      articleUrl: item.articleUrl,
      source: item.source,
      summary: '이 목록은 제목·언론사·발행 시각만 수집합니다. 기사 본문과 요약은 수집하지 않았습니다.',
      directImpact: [],
      indirectImpact: [],
      counterPerspective: '',
      unconfirmedPoints: ['투자 영향과 감성·중요도는 평가하지 않았습니다.', '분류는 뉴스 검색어를 기준으로 합니다.'],
    };
  }

  private loadFeed(feed: NewsFeed): Promise<NewsItem[]> {
    const cached = this.cache.get(feed.url);
    if (cached && cached.expiresAt > this.now()) return Promise.resolve(cached.items);
    const pending = this.inFlight.get(feed.url);
    if (pending) return pending;
    const request = this.fetchFeed(feed).finally(() => this.inFlight.delete(feed.url));
    this.inFlight.set(feed.url, request);
    return request;
  }

  private async fetchFeed(feed: NewsFeed): Promise<NewsItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(feed.url, {
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('뉴스 서버가 요청을 처리하지 못했습니다. HTTP ' + response.status);
      }
      const xml = await readBoundedResponse(response);
      const fetchedAt = this.now();
      const items = parseNewsFeed(xml, feed, fetchedAt);
      this.cache.set(feed.url, { expiresAt: fetchedAt + CACHE_TTL_MS, items });
      return items;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('뉴스 요청 시간이 초과되었습니다. 다시 시도해 주세요.', { cause: error });
      if (error instanceof Error) throw error;
      throw new Error('뉴스를 가져오지 못했습니다.', { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }
}
