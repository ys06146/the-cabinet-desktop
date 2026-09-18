import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marketContentService } from '../app/services/market-content-service';
import type { NewsDetail, NewsFilter, NewsItem } from '../domain/news';
import type { InvestmentTheme, ThemeId } from '../domain/theme';
import { reportApplicationError } from '../lib/report-error';

export type MarketContentLoadStatus = 'loading' | 'ready' | 'error';

interface LoadableState<T> {
  data: T;
  error: string | null;
  status: MarketContentLoadStatus;
}

interface DetailState {
  data: NewsDetail | null;
  error: string | null;
  status: 'idle' | MarketContentLoadStatus;
}

export interface MarketContentState {
  activeNewsFilter: NewsFilter;
  closeNewsDetail: () => void;
  news: LoadableState<readonly NewsItem[]>;
  newsDetail: DetailState;
  retryNews: () => void;
  retryNewsDetail: (newsId: string) => void;
  retryThemes: () => void;
  selectNews: (newsId: string) => void;
  selectedNewsId: string | null;
  selectedThemeId: ThemeId | null;
  selectTheme: (themeId: ThemeId) => void;
  setNewsFilter: (filter: NewsFilter) => void;
  themes: LoadableState<readonly InvestmentTheme[]>;
}

const initialNews: LoadableState<readonly NewsItem[]> = {
  data: [],
  error: null,
  status: 'loading',
};

const initialThemes: LoadableState<readonly InvestmentTheme[]> = {
  data: [],
  error: null,
  status: 'loading',
};

const initialDetail: DetailState = {
  data: null,
  error: null,
  status: 'idle',
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useMarketContent(savedNewsIds: readonly string[]): MarketContentState {
  const [activeNewsFilter, setActiveNewsFilter] = useState<NewsFilter>('all');
  const [news, setNews] = useState(initialNews);
  const [themes, setThemes] = useState(initialThemes);
  const [newsDetail, setNewsDetail] = useState(initialDetail);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | null>(null);
  const [newsRevision, setNewsRevision] = useState(0);
  const [themeRevision, setThemeRevision] = useState(0);
  const detailRequestId = useRef(0);
  const normalizedSavedNewsIds = useMemo(
    () => [...savedNewsIds].sort(),
    [savedNewsIds],
  );

  useEffect(() => {
    let active = true;
    setNews((current) => ({ ...current, error: null, status: 'loading' }));

    marketContentService
      .loadNews(activeNewsFilter)
      .then((items) => {
        if (active) {
          setNews({ data: items, error: null, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        reportApplicationError(error);
        setNews({
          data: [],
          error: getErrorMessage(error, '목업 뉴스를 불러오지 못했습니다.'),
          status: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [activeNewsFilter, newsRevision]);

  useEffect(() => {
    let active = true;
    setThemes((current) => ({ ...current, error: null, status: 'loading' }));

    marketContentService
      .loadThemes()
      .then((items) => {
        if (!active) {
          return;
        }
        setThemes({ data: items, error: null, status: 'ready' });
        setSelectedThemeId((current) => current ?? items[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        reportApplicationError(error);
        setThemes({
          data: [],
          error: getErrorMessage(error, '목업 테마를 불러오지 못했습니다.'),
          status: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [themeRevision]);

  const loadNewsDetail = useCallback((newsId: string) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedNewsId(newsId);
    setNewsDetail({ data: null, error: null, status: 'loading' });

    marketContentService
      .loadNewsDetail(newsId)
      .then((detail) => {
        if (detailRequestId.current === requestId) {
          setNewsDetail({ data: detail, error: null, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (detailRequestId.current !== requestId) {
          return;
        }
        reportApplicationError(error);
        setNewsDetail({
          data: null,
          error: getErrorMessage(error, '뉴스 상세 내용을 불러오지 못했습니다.'),
          status: 'error',
        });
      });
  }, []);

  const closeNewsDetail = useCallback(() => {
    detailRequestId.current += 1;
    setSelectedNewsId(null);
    setNewsDetail(initialDetail);
  }, []);

  const setNewsFilter = useCallback((filter: NewsFilter) => {
    detailRequestId.current += 1;
    setSelectedNewsId(null);
    setNewsDetail(initialDetail);
    setNews(initialNews);
    setActiveNewsFilter(filter);
  }, []);

  const visibleNews = useMemo<LoadableState<readonly NewsItem[]>>(() => {
    const savedIds = new Set(normalizedSavedNewsIds);
    return {
      ...news,
      data: news.data.map((item) => ({ ...item, isSaved: savedIds.has(item.id) })),
    };
  }, [news, normalizedSavedNewsIds]);

  return {
    activeNewsFilter,
    closeNewsDetail,
    news: visibleNews,
    newsDetail,
    retryNews: () => setNewsRevision((revision) => revision + 1),
    retryNewsDetail: loadNewsDetail,
    retryThemes: () => setThemeRevision((revision) => revision + 1),
    selectNews: loadNewsDetail,
    selectedNewsId,
    selectedThemeId,
    selectTheme: setSelectedThemeId,
    setNewsFilter,
    themes,
  };
}
