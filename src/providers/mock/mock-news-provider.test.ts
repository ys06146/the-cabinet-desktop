import { afterEach, describe, expect, it, vi } from 'vitest';
import { NEWS_FILTERS, type NewsFilter } from '../../domain/news';
import { FICTITIOUS_NEWS_OUTLETS } from './news-fixtures';
import {
  MockNewsProvider,
  MockNewsProviderError,
} from './mock-news-provider';

afterEach(() => {
  vi.useRealTimers();
});

describe('MockNewsProvider', () => {
  it('returns twelve entirely fictional, mock-labelled news summaries', async () => {
    const provider = new MockNewsProvider({ latencyMs: 0 });
    const news = await provider.getNews('all');

    expect(news).toHaveLength(12);
    expect(new Set(news.map((item) => item.id)).size).toBe(news.length);
    expect(
      news.every(
        (item) =>
          item.source === 'mock' &&
          item.isSaved === false &&
          item.title.startsWith('가상') &&
          FICTITIOUS_NEWS_OUTLETS.includes(
            item.outlet as (typeof FICTITIOUS_NEWS_OUTLETS)[number],
          ) &&
          item.summaryLines.length === 2 &&
          !('url' in item),
      ),
    ).toBe(true);
  });

  it('applies region and category filters with one explicit meaning each', async () => {
    const provider = new MockNewsProvider({ latencyMs: 0 });
    const expectedCount: Record<NewsFilter, number> = {
      all: 12,
      domestic: 9,
      us: 8,
      company: 3,
      industry: 5,
      economy: 1,
      policy: 3,
    };

    for (const filter of NEWS_FILTERS) {
      const news = await provider.getNews(filter);
      expect(news).toHaveLength(expectedCount[filter]);
      if (filter === 'domestic' || filter === 'us') {
        expect(news.every((item) => item.regions.includes(filter))).toBe(true);
      } else if (filter !== 'all') {
        expect(news.every((item) => item.category === filter)).toBe(true);
      }
    }
  });

  it('returns the five requested analysis sections for a selected item', async () => {
    const provider = new MockNewsProvider({ latencyMs: 0 });
    const detail = await provider.getNewsDetail('mock-news-001');

    expect(detail.newsId).toBe('mock-news-001');
    expect(detail.summary.length).toBeGreaterThan(0);
    expect(detail.directImpact.length).toBeGreaterThan(0);
    expect(detail.indirectImpact.length).toBeGreaterThan(0);
    expect(detail.counterPerspective.length).toBeGreaterThan(0);
    expect(detail.unconfirmedPoints.length).toBeGreaterThan(0);
  });

  it('returns defensive copies and rejects unknown ids', async () => {
    const provider = new MockNewsProvider({ latencyMs: 0 });
    const first = await provider.getNews('all');
    first[0].title = 'changed';
    const second = await provider.getNews('all');
    expect(second[0].title).not.toBe('changed');

    const detail = await provider.getNewsDetail('mock-news-001');
    (detail.directImpact as string[]).push('changed');
    const nextDetail = await provider.getNewsDetail('mock-news-001');
    expect(nextDetail.directImpact).not.toContain('changed');
    await expect(provider.getNewsDetail('unknown')).rejects.toThrow('Unknown mock news id');
  });

  it('supports deterministic latency and forced failures', async () => {
    vi.useFakeTimers();
    const delayed = new MockNewsProvider({ latencyMs: 80 });
    let settled = false;
    const request = delayed.getNews('all').then((items) => {
      settled = true;
      return items;
    });
    await vi.advanceTimersByTimeAsync(79);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toHaveLength(12);

    const failed = new MockNewsProvider({
      latencyMs: 0,
      failureRateByOperation: { detail: 1 },
      random: () => 0,
    });
    await expect(failed.getNewsDetail('mock-news-001')).rejects.toBeInstanceOf(
      MockNewsProviderError,
    );
  });
});
