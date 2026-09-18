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

  if (overview.status === 'loading') {
    return <OverviewSkeleton />;
  }

  if (overview.status === 'error') {
    return (
      <ErrorMessage
        message={overview.error ?? 'The market overview could not be loaded.'}
        onRetry={retryOverview}
        retryLabel="Reload mock data"
        title="Market Room is unavailable"
      />
    );
  }

  if (!overview.data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <MarketSummaryStrip summary={overview.data.summary} />

      {overview.data.watchlist.length === 0 ? (
        <EmptyState
          description="The configured mock provider returned no watchlist symbols."
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
                Refreshing chart and analysis…
              </p>
            ) : null}

            {research.status === 'error' ? (
              <ErrorMessage
                message={research.error ?? 'The selected stock research could not be loaded.'}
                onRetry={retryResearch}
                retryLabel="Retry analysis"
                title="Research calculation failed"
              />
            ) : null}

            {research.data ? (
              <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <MarketChart
                  candles={research.data.candles}
                  indicators={research.data.indicators}
                  key={`${research.data.quote.symbol}:${research.data.range}`}
                  onRangeChange={handleRangeChange}
                  quote={research.data.quote}
                  range={range}
                />
                <AnalysisPanel analysis={research.data.analysis} quote={research.data.quote} />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
