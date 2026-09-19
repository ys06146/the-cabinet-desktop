import type { NewsDetail, NewsFilter, NewsItem } from '../../domain/news';
import type { InvestmentTheme, ThemeId } from '../../domain/theme';
import type { NewsProvider } from '../../providers/news/news-provider';
import { electronNewsProvider } from '../../providers/news/electron-news-provider';
import { mockThemeProvider } from '../../providers/mock/mock-theme-provider';
import type { ThemeProvider } from '../../providers/theme/theme-provider';

export interface MarketContentOverview {
  news: readonly NewsItem[];
  themes: readonly InvestmentTheme[];
}

export class MarketContentService {
  constructor(
    private readonly newsProvider: NewsProvider,
    private readonly themeProvider: ThemeProvider,
  ) {}

  async loadOverview(
    filter: NewsFilter = 'all',
    savedNewsIds: readonly string[] = [],
  ): Promise<MarketContentOverview> {
    const [news, themes] = await Promise.all([
      this.loadNews(filter, savedNewsIds),
      this.loadThemes(),
    ]);
    return { news, themes };
  }

  async loadNews(
    filter: NewsFilter,
    savedNewsIds: readonly string[] = [],
  ): Promise<readonly NewsItem[]> {
    const savedIds = new Set(savedNewsIds);
    const news = await this.newsProvider.getNews(filter);
    return news.map((item) => ({ ...item, isSaved: savedIds.has(item.id) }));
  }

  loadNewsDetail(newsId: string): Promise<NewsDetail> {
    return this.newsProvider.getNewsDetail(newsId);
  }

  loadThemes(): Promise<InvestmentTheme[]> {
    return this.themeProvider.getThemes();
  }

  loadTheme(themeId: ThemeId): Promise<InvestmentTheme> {
    return this.themeProvider.getTheme(themeId);
  }
}

export const marketContentService = new MarketContentService(
  electronNewsProvider,
  mockThemeProvider,
);
