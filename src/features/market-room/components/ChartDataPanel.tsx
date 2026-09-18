import type { ChartRange, OHLCV, StockQuote } from '../../../domain/market';
import type { TechnicalIndicators } from '../../../domain/market-indicators';
import {
  formatChartTimestamp,
  formatCompactNumber,
  formatPrice,
} from '../market-formatters';
import { indicatorLabel } from './chart-rendering';

interface ChartDataPanelProps {
  candle: OHLCV;
  cursorIndex: number;
  indicators: TechnicalIndicators;
  quote: StockQuote;
  range: ChartRange;
}

export function ChartDataPanel({
  candle,
  cursorIndex,
  indicators,
  quote,
  range,
}: ChartDataPanelProps): React.JSX.Element {
  const values = [
    ['Open', formatPrice(candle.open, quote.currency)],
    ['High', formatPrice(candle.high, quote.currency)],
    ['Low', formatPrice(candle.low, quote.currency)],
    ['Close', formatPrice(candle.close, quote.currency)],
    ['Volume', formatCompactNumber(candle.volume)],
    ['RSI 14', indicatorLabel(indicators.rsi14[cursorIndex])],
    ['MACD', indicatorLabel(indicators.macd.macd[cursorIndex])],
  ] as const;

  return (
    <>
      <div className="grid gap-px border-t border-cabinet-border bg-cabinet-border sm:grid-cols-2 xl:grid-cols-[1.2fr_repeat(7,minmax(0,1fr))]">
        <div className="bg-cabinet-background/70 px-3 py-3">
          <p className="text-[0.58rem] uppercase tracking-wider text-cabinet-muted">Crosshair</p>
          <p className="mt-1 font-mono text-xs text-cabinet-text">
            {formatChartTimestamp(candle.timestamp, range)}
          </p>
        </div>
        {values.map(([label, value]) => (
          <div className="bg-cabinet-background/70 px-3 py-3" key={label}>
            <p className="text-[0.58rem] uppercase tracking-wider text-cabinet-muted">{label}</p>
            <p className="mt-1 truncate font-mono text-xs text-cabinet-text">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-cabinet-border px-4 py-3 text-[0.62rem] text-cabinet-muted">
        <span><i className="mr-1.5 inline-block h-px w-4 bg-cabinet-brass align-middle" />SMA 5</span>
        <span><i className="mr-1.5 inline-block h-px w-4 bg-cabinet-warning align-middle" />SMA 20</span>
        <span><i className="mr-1.5 inline-block h-px w-4 bg-cabinet-muted align-middle" />SMA 60</span>
        <span className="font-mono">Signal {indicatorLabel(indicators.macd.signal[cursorIndex])}</span>
        <span className="font-mono">Histogram {indicatorLabel(indicators.macd.histogram[cursorIndex])}</span>
      </div>
    </>
  );
}

