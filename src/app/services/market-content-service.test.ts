import { describe, expect, it } from 'vitest';
import { MockNewsProvider } from '../../providers/mock/mock-news-provider';
import { MockThemeProvider } from '../../providers/mock/mock-theme-provider';
import { MarketContentService } from './market-content-service';

const fixedNow = () => new Date('2026-07-30T08:30:00.000Z');

describe('MarketContentService', () => {
  it('overlays persisted saved ids without assigning persistence to the provider', async () => {
    const provider = new MockNewsProvider({ latencyMs: 0 });
    const service = new MarketContentService(
      provider,
      new MockThemeProvider({ latencyMs: 0, now: fixedNow }),
    );

    const providerItems = await provider.getNews('all');
    expect(providerItems.every((item) => item.isSaved === false)).toBe(true);

    const news = await service.loadNews('all', ['mock-news-002', 'mock-news-009']);
    expect(news.filter((item) => item.isSaved).map((item) => item.id)).toEqual([
      'mock-news-002',
      'mock-news-009',
    ]);
  });

  it('loads filtered news and themes through interface-backed providers', async () => {
    const service = new MarketContentService(
      new MockNewsProvider({ latencyMs: 0 }),
      new MockThemeProvider({ latencyMs: 0, now: fixedNow }),
    );
    const overview = await service.loadOverview('policy', ['mock-news-004']);

    expect(overview.news).toHaveLength(3);
    expect(overview.news.every((item) => item.category === 'policy')).toBe(true);
    expect(overview.news.find((item) => item.id === 'mock-news-004')?.isSaved).toBe(true);
    expect(overview.themes).toHaveLength(10);
  });
});
