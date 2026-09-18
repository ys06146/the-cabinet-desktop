import type { MarketSummary, MarketSummaryItem } from '../../../domain/market';
import { formatDataSource, formatPercent, formatSummaryValue, formatUpdatedAt } from '../market-formatters';

interface MarketSummaryStripProps {
  summary: MarketSummary;
}

function createSparklinePoints(item: MarketSummaryItem): string {
  const values = item.sparkline.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  return values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 28 - ((value - minimum) / spread) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function SummaryItem({ item }: { item: MarketSummaryItem }): React.JSX.Element {
  const rising = item.changePercent >= 0;
  const tone = rising ? 'text-cabinet-positive' : 'text-cabinet-negative';

  return (
    <article className="min-w-0 border-b border-r border-cabinet-border bg-cabinet-surface/45 p-3 last:border-r-0 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">
            {item.label}
          </p>
          <p className="mt-2 truncate font-mono text-lg font-semibold text-cabinet-text">
            {formatSummaryValue(item)}
          </p>
        </div>
        <span className="rounded-cabinet-sm border border-cabinet-border px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-cabinet-brass">
          {formatDataSource(item.source)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className={`font-mono text-xs font-semibold ${tone}`}>
            {rising ? 'Up' : 'Down'} {formatPercent(item.changePercent)}
          </p>
          <p className="mt-1 text-[0.58rem] uppercase tracking-wider text-cabinet-muted">
            Updated {formatUpdatedAt(item.updatedAt)}
          </p>
        </div>
        <svg
          aria-label={`${item.label} ${formatDataSource(item.source)} sparkline, ${rising ? 'rising' : 'falling'}`}
          className={`h-8 w-20 shrink-0 ${tone}`}
          role="img"
          viewBox="0 0 100 32"
        >
          <polyline
            fill="none"
            points={createSparklinePoints(item)}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
    </article>
  );
}

export function MarketSummaryStrip({ summary }: MarketSummaryStripProps): React.JSX.Element {
  return (
    <section aria-labelledby="market-summary-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
            Market pulse
          </p>
          <h2 className="mt-1 font-serif text-2xl text-cabinet-text" id="market-summary-title">
            The morning board
          </h2>
        </div>
        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-cabinet-muted">
          {formatDataSource(summary.source)} · {formatUpdatedAt(summary.updatedAt)}
        </p>
      </div>
      <div className="grid overflow-hidden rounded-cabinet-md border-l border-t border-cabinet-border sm:grid-cols-2 xl:grid-cols-4">
        {summary.items.map((item) => (
          <SummaryItem item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

