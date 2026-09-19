import type { NewsProvider } from './news-provider';

export const electronNewsProvider: NewsProvider = {
  getNews: (filter) => window.theCabinet.getNews(filter),
  getNewsDetail: (newsId) => window.theCabinet.getNewsDetail(newsId),
};
