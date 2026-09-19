import { formatSourceTime } from './source-formatters';
import { useEffect, useRef } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import type { ChartRange } from '../../../domain/market';
import type { MarketRoomState } from '../../../hooks/use-market-room';
import { AnalysisPanel } from './AnalysisPanel';
import { MarketChart } from './MarketChart';
import { MarketSummaryStrip } from './MarketSummaryStrip';
import { WatchlistPanel } from './WatchlistPanel';

function OverviewSkeleton(): React.JSX.Element {
  return (
    <section aria-label="Loading Market Room" className="space-y-5">
      <div className="border border-cabinet-border bg-cabinet-surface/55 p-5">
        <LoadingSkeleton label="Loading market summary" lines={4} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border border-cabinet-border bg-cabinet-surface/55 p-5">
          <LoadingSkeleton label="Loading watchlist" lines={6} />
        </div>
        <div className="border border-cabinet-border bg-cabinet-surface/55 p-5">
          <LoadingSkeleton label="Loading research view" lines={6} />
        </div>
      </div>
    </section>
  );
}

function ResearchSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-80 border border-cabinet-border bg-cabinet-surface/55 p-5">
        <LoadingSkeleton label="Loading price history and indicators" lines={6} />
      </section>
      <section className="border border-cabinet-border bg-cabinet-surface/55 p-5">
        <LoadingSkeleton label="Calculating market analysis" lines={6} />
      </section>
    </div>
  );
}

interface MarketResearchDeskProps {
  market: MarketRoomState;
}

export function MarketResearchDesk({ market }: MarketResearchDeskProps): React.JSX.Element {
  const {
    overview,
    range,
    research,
    retryOverview,
    retryResearch,
    selectedSymbol,
    selectRange,
    selectSymbol,
  } = market;
  const pendingRangeFocus = useRef<ChartRange | null>(null);

  const handleRangeChange = (nextRange: ChartRange): void => {
    pendingRangeFocus.current = nextRange;
    selectRange(nextRange);
  };

  useEffect(() => {
    const pendingRange = pendingRangeFocus.current;
    if (research.status !== 'ready' || research.data?.range !== pendingRange) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-chart-range="${pendingRange}"]`)
        ?.focus();
      if (pendingRangeFocus.current === pendingRange) {
        pendingRangeFocus.current = null;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [research.data?.range, research.status]);

  if (overview.status === 'loading' && !overview.data) {
    return <OverviewSkeleton />;
  }

  if (overview.status === 'error' && !overview.data) {
    return (
      <ErrorMessage
        message={overview.error ?? 'The market overview could not be loaded.'}
        onRetry={retryOverview}
        retryLabel="시세 다시 불러오기"
        title="Market Room is unavailable"
      />
    );
  }

  if (!overview.data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cabinet-border pb-4">
        <p className="text-xs leading-6 text-cabinet-muted">1분마다 확인 · 마지막 확인 {formatSourceTime(overview.lastCheckedAt)}<br />제공처 갱신 간격과 휴장 중에는 같은 시세가 유지될 수 있습니다.</p>
        <button className="min-h-11 border border-cabinet-brass px-4 text-xs font-bold text-cabinet-text disabled:opacity-50" disabled={overview.status === 'loading' || research.status === 'loading'} onClick={market.refresh} type="button">{overview.status === 'loading' || research.status === 'loading' ? '확인 중…' : '시세 새로고침'}</button>
      </div>
      {overview.error ? <div className="border-l-2 border-cabinet-warning bg-cabinet-warning/5 p-4 text-xs leading-6 text-cabinet-warning" role="alert">갱신하지 못해 마지막으로 받은 시세를 표시합니다. {overview.error}</div> : null}
      {overview.data.warnings?.map((warning) => <p className="border-l-2 border-cabinet-warning p-3 text-xs text-cabinet-warning" key={warning} role="status">{warning}</p>)}
      {overview.data.summary ? <MarketSummaryStrip summary={overview.data.summary} /> : null}

      {overview.data.watchlist.length === 0 ? (
        <EmptyState
          description="받아온 종목이 없습니다. 새로고침해 다시 확인하세요."
          title="The watchlist is empty"
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
          <WatchlistPanel
            onSelect={selectSymbol}
            quotes={overview.data.watchlist}
            selectedSymbol={selectedSymbol}
          />

          <div aria-busy={research.status === 'loading'} className="min-w-0">
            {research.status === 'idle' || (research.status === 'loading' && !research.data) ? (
              <ResearchSkeleton />
            ) : null}

            {research.status === 'loading' && research.data ? (
              <p
                className="mb-3 border-l-2 border-cabinet-brass bg-cabinet-surface px-3 py-2 text-xs text-cabinet-muted"
                role="status"
              >
                차트와 분석을 갱신하고 있습니다…
              </p>
            ) : null}

            {research.status === 'error' ? (
              <ErrorMessage
                message={research.error ?? 'The selected stock research could not be loaded.'}
                onRetry={retryResearch}
                retryLabel="Retry analysis"
                title={research.data ? "갱신 실패 · 마지막으로 받은 차트와 분석입니다" : "차트와 분석을 불러오지 못했습니다"}
              />
            ) : null}

            {research.data ? (
              <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <MarketChart
                  candles={research.data.candles}
                  chartSource={research.data.chartSource}
                  chartDelayMinutes={research.data.chartDelayMinutes}
                  lastCheckedAt={research.lastCheckedAt}
                  indicators={research.data.indicators}
                  key={`${research.data.quote.symbol}:${research.data.range}`}
                  onRangeChange={handleRangeChange}
                  quote={research.data.quote}
                  range={range}
                />
                <AnalysisPanel analysis={research.data.analysis} chartSource={research.data.chartSource} quote={research.data.quote} />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
