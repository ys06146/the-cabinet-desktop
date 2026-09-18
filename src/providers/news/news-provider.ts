import type { NewsDetail, NewsFilter, NewsItem } from '../../domain/news';

export interface NewsProvider {
  getNews(filter: NewsFilter): Promise<NewsItem[]>;
  getNewsDetail(newsId: string): Promise<NewsDetail>;
}
