import type { MarketRegion } from './market';
import type { ThemeName } from './theme';

export const NEWS_FILTERS = [
  'all',
  'domestic',
  'us',
  'company',
  'industry',
  'economy',
  'policy',
] as const;

export const NEWS_CATEGORIES = ['company', 'industry', 'economy', 'policy'] as const;

export type NewsFilter = (typeof NEWS_FILTERS)[number];
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export type NewsImportance = 'high' | 'medium' | 'low' | 'unrated';
export type NewsSentiment = 'positive' | 'neutral' | 'negative' | 'unrated';
export type NewsSource = 'mock' | 'google-news-rss';

export interface NewsItem {
  id: string;
  title: string;
  outlet: string;
  publishedAt: string;
  fetchedAt?: string;
  articleUrl?: string;
  regions: readonly MarketRegion[];
  category: NewsCategory;
  relatedSymbols: readonly string[];
  relatedThemes: readonly ThemeName[];
  importance: NewsImportance;
  sentiment: NewsSentiment;
  summaryLines: readonly [string, string];
  isSaved: boolean;
  source: NewsSource;
}

export interface NewsDetail {
  newsId: string;
  title?: string;
  outlet?: string;
  publishedAt?: string;
  fetchedAt?: string;
  articleUrl?: string;
  source?: NewsSource;
  summary: string;
  directImpact: readonly string[];
  indirectImpact: readonly string[];
  counterPerspective: string;
  unconfirmedPoints: readonly string[];
}
