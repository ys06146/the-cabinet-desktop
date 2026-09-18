import type { MarketRegion, StockQuote } from '../../../domain/market';
import { formatPercent, formatPrice } from '../market-formatters';

interface WatchlistPanelProps {
  onSelect: (symbol: string) => void;
  quotes: readonly StockQuote[];
  selectedSymbol: string | null;
}

const REGION_LABELS: Record<MarketRegion, string> = {
  domestic: 'Domestic',
  us: 'United States',
};

function QuoteButton({
  quote,
  selected,
  onSelect,
}: {
  quote: StockQuote;
  selected: boolean;
  onSelect: (symbol: string) => void;
}): React.JSX.Element {
  const rising = quote.changePercent >= 0;
  return (
    <button
      aria-pressed={selected}
      className={`grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-cabinet-border px-3 py-2.5 text-left last:border-b-0 hover:bg-cabinet-elevated/70 ${
        selected ? 'border-l-2 border-l-cabinet-brass bg-cabinet-elevated' : 'border-l-2 border-l-transparent'
      }`}
      onClick={() => onSelect(quote.symbol)}
      type="button"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-cabinet-text">{quote.name}</span>
        <span className="mt-1 block truncate font-mono text-[0.62rem] uppercase tracking-wider text-cabinet-muted">
          {quote.symbol} · {quote.exchange}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-xs font-semibold text-cabinet-text">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <span
          className={`mt-1 block font-mono text-[0.65rem] ${
            rising ? 'text-cabinet-positive' : 'text-cabinet-negative'
          }`}
        >
          {rising ? 'Up ' : 'Down '}{formatPercent(quote.changePercent)}
        </span>
      </span>
    </button>
  );
}

export function WatchlistPanel({
  onSelect,
  quotes,
  selectedSymbol,
}: WatchlistPanelProps): React.JSX.Element {
  return (
    <aside aria-labelledby="watchlist-title" className="border border-cabinet-border bg-cabinet-surface/55">
      <div className="border-b border-cabinet-border px-4 py-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
          Curated list
        </p>
        <h2 className="mt-1 font-serif text-2xl text-cabinet-text" id="watchlist-title">
          Watchlist
        </h2>
        <p className="mt-2 text-xs leading-5 text-cabinet-muted">
          Select a company to refresh the chart and analysis together.
        </p>
      </div>

      {(['domestic', 'us'] as const).map((region) => {
        const regionalQuotes = quotes.filter((quote) => quote.region === region);
        return (
          <section aria-labelledby={`watchlist-${region}`} key={region}>
            <h3
              className="border-b border-cabinet-border bg-cabinet-background/45 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-muted"
              id={`watchlist-${region}`}
            >
              {REGION_LABELS[region]}
            </h3>
            {regionalQuotes.map((quote) => (
              <QuoteButton
                key={quote.symbol}
                onSelect={onSelect}
                quote={quote}
                selected={selectedSymbol === quote.symbol}
              />
            ))}
          </section>
        );
      })}
    </aside>
  );
}

