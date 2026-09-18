import { useEffect, useRef } from 'react';
import { NEWS_FILTERS, type NewsDetail, type NewsFilter, type NewsItem } from '../../../domain/news';

const FILTER_LABELS: Record<NewsFilter, string> = {
  all: '전체',
  domestic: '국내',
  us: '미국',
  company: '기업',
  industry: '산업',
  economy: '경제',
  policy: '정책',
};


const IMPORTANCE_PRESENTATION: Record<NewsItem['importance'], { label: string; className: string }> = {
  high: { label: '높음', className: 'border-cabinet-warning/70 text-cabinet-warning' },
  medium: { label: '보통', className: 'border-cabinet-border text-cabinet-muted' },
  low: { label: '낮음', className: 'border-cabinet-border/70 text-cabinet-muted' },
};

const SENTIMENT_PRESENTATION: Record<NewsItem['sentiment'], { label: string; className: string }> = {
  positive: { label: '긍정', className: 'text-cabinet-positive' },
  neutral: { label: '중립', className: 'text-cabinet-muted' },
  negative: { label: '부정', className: 'text-cabinet-negative' },
};

export interface NewsDeskProps {
  activeFilter: NewsFilter;
  detail: NewsDetail | null;
  detailError?: string | null;
  isDetailLoading?: boolean;
  isListLoading?: boolean;
  items: readonly NewsItem[];
  listError?: string | null;
  onCloseDetail: () => void;
  onFilterChange: (filter: NewsFilter) => void;
  onRetryDetail?: (newsId: string) => void;
  onRetryList?: () => void;
  onSelectNews: (newsId: string) => void;
  onToggleSaved: (newsId: string) => void;
  selectedNewsId: string | null;
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function TagList({ label, values }: { label: string; values: readonly string[] }): React.JSX.Element | null {
  if (values.length === 0) {
    return null;
  }

  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={label}>
      {values.map((value) => (
        <li
          className="max-w-full truncate border border-cabinet-border bg-cabinet-background/40 px-2 py-1 font-mono text-[0.6rem] text-cabinet-muted"
          key={value}
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

function ImpactList({ items }: { items: readonly string[] }): React.JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-cabinet-muted">현재 목업에서 제시된 항목이 없습니다.</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-cabinet-muted">
      {items.map((item) => (
        <li className="flex gap-3" key={item}>
          <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-cabinet-brass" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailSection({
  children,
  title,
  tone = 'default',
}: {
  children: React.ReactNode;
  title: string;
  tone?: 'default' | 'warning';
}): React.JSX.Element {
  return (
    <section
      className={`border-b border-cabinet-border px-5 py-5 last:border-b-0 sm:px-6 ${
        tone === 'warning' ? 'border-l-2 border-l-cabinet-warning bg-cabinet-warning/5' : ''
      }`}
    >
      <h3
        className={`text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
          tone === 'warning' ? 'text-cabinet-warning' : 'text-cabinet-brass'
        }`}
      >
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function NewsDetailDrawer({
  detail,
  error,
  isLoading,
  news,
  onClose,
  onRetry,
  triggerRef,
}: {
  detail: NewsDetail | null;
  error: string | null;
  isLoading: boolean;
  news: NewsItem | null;
  onClose: () => void;
  onRetry?: (newsId: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentDetail = detail?.newsId === news?.id ? detail : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (news && !dialog.open) {
      dialog.showModal();
    } else if (!news && dialog.open) {
      dialog.close();
    }
  }, [news]);

  const handleClose = (): void => {
    onClose();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <dialog
      aria-labelledby="news-detail-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-[30rem] overflow-hidden border-0 border-l border-cabinet-border bg-cabinet-elevated p-0 text-cabinet-text shadow-cabinet-overlay backdrop:bg-black/70"
      onClose={handleClose}
      ref={dialogRef}
    >
      {news ? (
        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 border-b border-cabinet-border bg-cabinet-surface px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
                  Mock News Brief
                </p>
                <h2 className="mt-2 font-serif text-xl leading-7 text-cabinet-text" id="news-detail-title">
                  {news.title}
                </h2>
                <p className="mt-2 text-xs text-cabinet-muted">
                  {news.outlet} · {formatPublishedAt(news.publishedAt)}
                </p>
              </div>
              <button
                autoFocus
                aria-label="뉴스 상세 닫기"
                className="flex min-h-11 shrink-0 items-center justify-center border border-cabinet-border px-3 text-sm font-semibold text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                닫기
              </button>
            </div>
          </header>

          <div aria-busy={isLoading} className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-4 px-5 py-6" role="status">
                <p className="text-sm text-cabinet-muted">뉴스 영향을 정리하고 있습니다…</p>
                {[72, 92, 61, 84].map((width) => (
                  <div
                    aria-hidden="true"
                    className="skeleton-shimmer h-3 rounded-cabinet-sm"
                    key={width}
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="m-5 border border-cabinet-negative/60 bg-cabinet-negative/5 p-4" role="alert">
                <p className="font-serif text-lg text-cabinet-negative">상세 내용을 불러오지 못했습니다</p>
                <p className="mt-2 text-sm leading-6 text-cabinet-muted">{error}</p>
                {onRetry ? (
                  <button
                    className="mt-4 min-h-11 border border-cabinet-negative px-4 text-sm font-semibold text-cabinet-text hover:bg-cabinet-negative/10"
                    onClick={() => onRetry(news.id)}
                    type="button"
                  >
                    다시 시도
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isLoading && !error && currentDetail ? (
              <>
                <DetailSection title="요약">
                  <p className="text-sm leading-7 text-cabinet-muted">{currentDetail.summary}</p>
                </DetailSection>
                <DetailSection title="직접 영향">
                  <ImpactList items={currentDetail.directImpact} />
                </DetailSection>
                <DetailSection title="간접 영향">
                  <ImpactList items={currentDetail.indirectImpact} />
                </DetailSection>
                <DetailSection title="반대 관점">
                  <p className="text-sm leading-7 text-cabinet-muted">{currentDetail.counterPerspective}</p>
                </DetailSection>
                <DetailSection title="확인되지 않은 부분" tone="warning">
                  <ImpactList items={currentDetail.unconfirmedPoints} />
                </DetailSection>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

export function NewsDesk({
  activeFilter,
  detail,
  detailError = null,
  isDetailLoading = false,
  isListLoading = false,
  items,
  listError = null,
  onCloseDetail,
  onFilterChange,
  onRetryDetail,
  onRetryList,
  onSelectNews,
  onToggleSaved,
  selectedNewsId,
}: NewsDeskProps): React.JSX.Element {
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedNews = items.find((item) => item.id === selectedNewsId) ?? null;

  return (
    <section aria-labelledby="market-news-title" className="border border-cabinet-border bg-cabinet-surface/45">
      <header className="border-b border-cabinet-border px-4 py-5 sm:px-5">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
          Fictional News Desk
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-cabinet-text" id="market-news-title">
              뉴스
            </h2>
            <p className="mt-2 text-xs leading-5 text-cabinet-muted">
              실제 기사를 복제하지 않은 완전한 가상 목업 콘텐츠입니다.
            </p>
          </div>
          <span className="border border-cabinet-brass/60 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-cabinet-brass">
            Mock · {items.length}
          </span>
        </div>
      </header>

      <nav aria-label="뉴스 필터" className="flex flex-wrap gap-2 border-b border-cabinet-border px-4 py-3">
        {NEWS_FILTERS.map((filter) => (
          <button
            aria-pressed={activeFilter === filter}
            className={`min-h-10 border px-3 text-xs font-semibold ${
              activeFilter === filter
                ? 'border-cabinet-brass bg-cabinet-accent text-cabinet-text'
                : 'border-cabinet-border text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text'
            }`}
            key={filter}
            onClick={() => onFilterChange(filter)}
            type="button"
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </nav>

      {isListLoading ? (
        <div aria-live="polite" className="space-y-4 px-5 py-8" role="status">
          <p className="text-sm text-cabinet-muted">뉴스 목록을 불러오고 있습니다…</p>
          {[78, 94, 68, 86].map((width) => (
            <div
              aria-hidden="true"
              className="skeleton-shimmer h-3 rounded-cabinet-sm"
              key={width}
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      ) : listError ? (
        <div className="m-4 border border-cabinet-negative/60 bg-cabinet-negative/5 p-4" role="alert">
          <p className="font-serif text-lg text-cabinet-negative">뉴스를 불러오지 못했습니다</p>
          <p className="mt-2 text-sm leading-6 text-cabinet-muted">{listError}</p>
          {onRetryList ? (
            <button
              className="mt-4 min-h-11 border border-cabinet-negative px-4 text-sm font-semibold text-cabinet-text hover:bg-cabinet-negative/10"
              onClick={onRetryList}
              type="button"
            >
              다시 시도
            </button>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-serif text-xl text-cabinet-text">해당 필터의 뉴스가 없습니다</p>
          <p className="mt-2 text-sm text-cabinet-muted">다른 분류를 선택해 목업 브리프를 확인해 보세요.</p>
        </div>
      ) : (
        <div className="divide-y divide-cabinet-border">
          {items.map((item) => {
            const importance = IMPORTANCE_PRESENTATION[item.importance];
            const sentiment = SENTIMENT_PRESENTATION[item.sentiment];

            return (
              <article className="grid min-w-0 gap-3 px-4 py-4 hover:bg-cabinet-elevated/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5" key={item.id}>
                <button
                  aria-haspopup="dialog"
                  className="min-w-0 text-left"
                  onClick={(event) => {
                    detailTriggerRef.current = event.currentTarget;
                    onSelectNews(item.id);
                  }}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[0.62rem] font-semibold">
                    <span className="text-cabinet-muted">{item.outlet}</span>
                    <span aria-hidden="true" className="text-cabinet-border">·</span>
                    <time className="font-mono text-cabinet-muted" dateTime={item.publishedAt}>
                      {formatPublishedAt(item.publishedAt)}
                    </time>
                    <span className={`border px-1.5 py-0.5 ${importance.className}`}>중요도 {importance.label}</span>
                    <span className={sentiment.className}>{sentiment.label}</span>
                  </div>
                  <h3 className="mt-2 font-serif text-lg leading-7 text-cabinet-text">{item.title}</h3>
                  <span className="mt-2 block text-xs leading-5 text-cabinet-muted">
                    <span className="block line-clamp-1">{item.summaryLines[0]}</span>
                    <span className="block line-clamp-1">{item.summaryLines[1]}</span>
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TagList label="관련 종목" values={item.relatedSymbols} />
                    <TagList label="관련 테마" values={item.relatedThemes} />
                  </div>
                </button>

                <button
                  aria-label={`${item.title} ${item.isSaved ? '저장 해제' : '저장'}`}
                  aria-pressed={item.isSaved}
                  className={`min-h-11 self-start border px-3 text-xs font-semibold sm:min-w-16 ${
                    item.isSaved
                      ? 'border-cabinet-brass bg-cabinet-brass/10 text-cabinet-brass'
                      : 'border-cabinet-border text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text'
                  }`}
                  onClick={() => onToggleSaved(item.id)}
                  type="button"
                >
                  {item.isSaved ? '저장됨' : '저장'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <NewsDetailDrawer
        detail={detail}
        error={detailError}
        isLoading={isDetailLoading}
        news={selectedNews}
        onClose={onCloseDetail}
        onRetry={onRetryDetail}
        triggerRef={detailTriggerRef}
      />
    </section>
  );
}
