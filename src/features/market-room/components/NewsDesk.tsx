import { useEffect, useRef, useState } from 'react';
import { NEWS_FILTERS, type NewsDetail, type NewsFilter, type NewsItem } from '../../../domain/news';
import { formatSourceTime } from './source-formatters';

const FILTER_LABELS: Record<NewsFilter, string> = {
  all: '전체', domestic: '국내', us: '미국', company: '기업', industry: '산업', economy: '경제', policy: '정책',
};

export interface NewsDeskProps {
  activeFilter: NewsFilter;
  detail: NewsDetail | null;
  detailError?: string | null;
  isDetailLoading?: boolean;
  isListLoading?: boolean;
  items: readonly NewsItem[];
  listError?: string | null;
  lastCheckedAt?: string | null;
  onCloseDetail: () => void;
  onFilterChange: (filter: NewsFilter) => void;
  onRetryDetail?: (newsId: string) => void;
  onRetryList?: () => void;
  onSelectNews: (newsId: string) => void;
  onToggleSaved: (newsId: string) => void;
  selectedNewsId: string | null;
}

function NewsArticleLink({ news }: { news: NewsItem }): React.JSX.Element | null {
  const [error, setError] = useState<string | null>(null);
  if (!news.articleUrl) return null;
  return (
    <div>
      <a
        className="inline-flex min-h-10 items-center border-b border-cabinet-brass text-xs font-bold text-cabinet-brass hover:text-cabinet-text"
        href={news.articleUrl}
        onClick={(event) => {
          event.preventDefault();
          setError(null);
          void window.theCabinet.openNewsArticle(news.id).catch(() => setError('기사를 열지 못했습니다. 뉴스를 새로고침한 뒤 다시 시도해 주세요.'));
        }}
        rel="noreferrer"
        target="_blank"
      >기사 열기 ↗</a>
      {error ? <p className="mt-2 text-xs text-cabinet-negative" role="alert">{error}</p> : null}
    </div>
  );
}

function NewsDetailDrawer({ detail, error, isLoading, news, onClose, onRetry, triggerRef }: {
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
    if (news && dialog && !dialog.open) dialog.showModal();
    else if (!news && dialog?.open) dialog.close();
  }, [news]);

  return (
    <dialog
      aria-labelledby="news-detail-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-[30rem] overflow-y-auto border-0 border-l border-cabinet-border bg-cabinet-elevated p-5 text-cabinet-text shadow-cabinet-overlay backdrop:bg-black/70 sm:p-6"
      onClose={() => { onClose(); window.requestAnimationFrame(() => triggerRef.current?.focus()); }}
      ref={dialogRef}
    >
      {news ? <>
        <div className="flex items-start justify-between gap-4 border-b border-cabinet-border pb-5">
          <div>
            <p className="text-xs text-cabinet-brass">{news.source === 'mock' ? '예시 뉴스' : 'Google News RSS'}</p>
            <h2 className="mt-3 font-serif text-xl leading-8" id="news-detail-title">{news.title}</h2>
          </div>
          <button autoFocus aria-label="뉴스 상세 닫기" className="min-h-11 shrink-0 border border-cabinet-border px-3 text-sm" onClick={() => dialogRef.current?.close()} type="button">닫기</button>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div><dt className="text-cabinet-muted">언론사</dt><dd className="mt-1">{news.outlet}</dd></div>
          <div><dt className="text-cabinet-muted">기사 발행</dt><dd className="mt-1"><time dateTime={news.publishedAt}>{formatSourceTime(news.publishedAt)}</time></dd></div>
          <div><dt className="text-cabinet-muted">피드 수신</dt><dd className="mt-1">{formatSourceTime(currentDetail?.fetchedAt ?? news.fetchedAt)}</dd></div>
        </dl>
        <p className="my-6 text-sm leading-7 text-cabinet-muted">공개 뉴스 피드에 제공된 제목과 발행 정보를 표시합니다. 기사 본문은 원문에서 확인하세요. 검색 피드 반영은 발행 시각보다 늦을 수 있습니다.</p>
        <NewsArticleLink news={news} />
        {isLoading ? <p className="mt-5 text-xs text-cabinet-muted" role="status">기사 정보를 확인하고 있습니다…</p> : null}
        {error ? <div className="mt-5 text-sm text-cabinet-negative" role="alert"><p>{error}</p>{onRetry ? <button className="mt-3 min-h-10 border border-cabinet-border px-3" onClick={() => onRetry(news.id)} type="button">다시 시도</button> : null}</div> : null}
      </> : null}
    </dialog>
  );
}

export function NewsDesk({ activeFilter, detail, detailError = null, isDetailLoading = false, isListLoading = false, items, listError = null, lastCheckedAt, onCloseDetail, onFilterChange, onRetryDetail, onRetryList, onSelectNews, onToggleSaved, selectedNewsId }: NewsDeskProps): React.JSX.Element {
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ item: NewsItem; filter: NewsFilter } | null>(null);
  const selectedNews = selection && selection.item.id === selectedNewsId && selection.filter === activeFilter
    ? selection.item
    : items.find((item) => item.id === selectedNewsId) ?? null;
  const closeDetail = (): void => {
    setSelection(null);
    onCloseDetail();
  };
  return (
    <section aria-labelledby="market-news-title" className="border border-cabinet-border bg-cabinet-surface/45">
      <header className="border-b border-cabinet-border px-4 py-5 sm:px-5">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">News Desk</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-cabinet-text" id="market-news-title">뉴스</h2>
            <p className="mt-2 text-xs leading-5 text-cabinet-muted">Google News RSS · 5분마다 확인 · 검색 피드 반영 지연 가능</p>
            <p className="mt-1 text-xs leading-5 text-cabinet-muted">마지막 확인 {formatSourceTime(lastCheckedAt)} · 피드 수신 {formatSourceTime(items[0]?.fetchedAt)}</p>
          </div>
          <button className="min-h-11 border border-cabinet-brass px-3 text-xs font-bold text-cabinet-text disabled:opacity-50" disabled={isListLoading} onClick={onRetryList} type="button">{isListLoading ? '확인 중…' : '뉴스 새로고침'}</button>
        </div>
      </header>
      <nav aria-label="뉴스 필터" className="flex flex-wrap gap-2 border-b border-cabinet-border px-4 py-3">
        {NEWS_FILTERS.map((filter) => <button aria-pressed={activeFilter === filter} className={`min-h-10 border px-3 text-xs font-semibold ${activeFilter === filter ? 'border-cabinet-brass bg-cabinet-accent text-cabinet-text' : 'border-cabinet-border text-cabinet-muted hover:border-cabinet-brass'}`} key={filter} onClick={() => { setSelection(null); onFilterChange(filter); }} type="button">{FILTER_LABELS[filter]}</button>)}
      </nav>
      {listError ? <div className="m-4 border-l-2 border-cabinet-warning bg-cabinet-warning/5 p-4" role="alert"><p className="text-sm text-cabinet-warning">{items.length ? '갱신하지 못해 마지막으로 받은 뉴스를 표시합니다.' : '뉴스를 불러오지 못했습니다.'}</p><p className="mt-2 text-xs text-cabinet-muted">{listError}</p></div> : null}
      {isListLoading && !items.length ? <p className="px-5 py-8 text-sm text-cabinet-muted" role="status">뉴스 목록을 불러오고 있습니다…</p> : null}
      {!isListLoading && !listError && !items.length ? <p className="px-5 py-12 text-center text-sm text-cabinet-muted">해당 필터의 뉴스가 없습니다.</p> : null}
      <div aria-busy={isListLoading} className="divide-y divide-cabinet-border">
        {items.map((item) => <article className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5" key={item.id}>
          <div className="min-w-0">
            <button aria-haspopup="dialog" className="w-full text-left" onClick={(event) => { detailTriggerRef.current = event.currentTarget; setSelection({ item, filter: activeFilter }); onSelectNews(item.id); }} type="button">
              <div className="flex flex-wrap gap-2 text-xs text-cabinet-muted"><span>{item.outlet}</span><span aria-hidden="true">·</span><time dateTime={item.publishedAt}>{formatSourceTime(item.publishedAt)}</time>{item.source === 'mock' ? <span>예시</span> : null}</div>
              <h3 className="mt-2 font-serif text-lg leading-7 text-cabinet-text">{item.title}</h3>
            </button>
            <NewsArticleLink news={item} />
          </div>
          <button aria-label={`${item.title} ${item.isSaved ? '저장 해제' : '저장'}`} aria-pressed={item.isSaved} className={`min-h-11 self-start border px-3 text-xs font-semibold ${item.isSaved ? 'border-cabinet-brass text-cabinet-brass' : 'border-cabinet-border text-cabinet-muted'}`} onClick={() => onToggleSaved(item.id)} type="button">{item.isSaved ? '저장됨' : '저장'}</button>
        </article>)}
      </div>
      <NewsDetailDrawer detail={detail} error={detailError} isLoading={isDetailLoading} news={selectedNews} onClose={closeDetail} onRetry={onRetryDetail} triggerRef={detailTriggerRef} />
    </section>
  );
}
