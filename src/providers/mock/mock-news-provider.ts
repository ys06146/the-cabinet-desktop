import type { NewsDetail, NewsFilter, NewsItem } from '../../domain/news';
import type { NewsProvider } from '../news/news-provider';
import { MOCK_NEWS_FIXTURES } from './news-fixtures';
import {
  MockProviderSimulator,
  type MockProviderSimulationOptions,
} from './mock-provider-simulator';

export type NewsOperation = 'list' | 'detail';
export type MockNewsProviderOptions = MockProviderSimulationOptions<NewsOperation>;

export class MockNewsProviderError extends Error {
  constructor(operation: NewsOperation) {
    super(`Mock news request failed during ${operation}.`);
    this.name = 'MockNewsProviderError';
  }
}

function matchesFilter(item: (typeof MOCK_NEWS_FIXTURES)[number]['item'], filter: NewsFilter) {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'domestic' || filter === 'us') {
    return item.regions.includes(filter);
  }
  return item.category === filter;
}

function createNewsItem(fixture: (typeof MOCK_NEWS_FIXTURES)[number]): NewsItem {
  return {
    ...fixture.item,
    regions: [...fixture.item.regions],
    relatedSymbols: [...fixture.item.relatedSymbols],
    relatedThemes: [...fixture.item.relatedThemes],
    summaryLines: [...fixture.item.summaryLines],
    isSaved: false,
    source: 'mock',
  };
}

function createNewsDetail(fixture: (typeof MOCK_NEWS_FIXTURES)[number]): NewsDetail {
  return {
    newsId: fixture.item.id,
    summary: fixture.detail.summary,
    directImpact: [...fixture.detail.directImpact],
    indirectImpact: [...fixture.detail.indirectImpact],
    counterPerspective: fixture.detail.counterPerspective,
    unconfirmedPoints: [...fixture.detail.unconfirmedPoints],
  };
}

export class MockNewsProvider implements NewsProvider {
  private readonly simulator: MockProviderSimulator<NewsOperation>;

  constructor(options: MockNewsProviderOptions = {}) {
    this.simulator = new MockProviderSimulator(
      options,
      (operation) => new MockNewsProviderError(operation),
    );
  }

  getNews(filter: NewsFilter): Promise<NewsItem[]> {
    return this.simulator.execute('list', () =>
      MOCK_NEWS_FIXTURES.filter((fixture) => matchesFilter(fixture.item, filter))
        .map(createNewsItem)
        .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
    );
  }

  getNewsDetail(newsId: string): Promise<NewsDetail> {
    return this.simulator.execute('detail', () => {
      const fixture = MOCK_NEWS_FIXTURES.find(({ item }) => item.id === newsId);
      if (!fixture) {
        throw new Error(`Unknown mock news id: ${newsId}`);
      }
      return createNewsDetail(fixture);
    });
  }
}

export const mockNewsProvider = new MockNewsProvider();
