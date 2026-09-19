import { useEffect, useState } from 'react';
import { formatSourceTime, marketDelayLabel, marketSessionLabel } from './source-formatters';
import {
  createFullViewport,
  normalizeViewport,
  panViewport,
  zoomViewport,
  type ChartViewport,
} from '../../../domain/chart-geometry';
import type { ChartRange, OHLCV, StockQuote } from '../../../domain/market';
import type { TechnicalIndicators } from '../../../domain/market-indicators';
import { formatCompactNumber, formatDataSource, formatPercent, formatPrice } from '../market-formatters';
import { ChartCanvas } from './ChartCanvas';
import { ChartControls } from './ChartControls';
import { ChartDataPanel } from './ChartDataPanel';

interface MarketChartProps {
  candles: readonly OHLCV[];
  chartSource?: 'yahoo' | 'mock';
  chartDelayMinutes?: number;
  lastCheckedAt?: string | null;
  indicators: TechnicalIndicators;
  onRangeChange: (range: ChartRange) => void;
  quote: StockQuote;
  range: ChartRange;
}

export function MarketChart({
  candles,
  chartSource = 'yahoo',
  chartDelayMinutes,
  lastCheckedAt,
  indicators,
  onRangeChange,
  quote,
  range,
}: MarketChartProps): React.JSX.Element {
  const [viewport, setViewport] = useState<ChartViewport>(() => createFullViewport(candles.length));
  const [cursorIndex, setCursorIndex] = useState(Math.max(0, candles.length - 1));
  const [liveMessage, setLiveMessage] = useState('');
  const selectedCandle = candles[cursorIndex] ?? candles.at(-1) ?? null;
  useEffect(() => {
    setViewport((current) => normalizeViewport(current, candles.length));
    setCursorIndex((current) => Math.min(current, Math.max(0, candles.length - 1)));
  }, [candles.length]);

  const updateViewport = (nextViewport: ChartViewport): void => {
    const normalized = normalizeViewport(nextViewport, candles.length);
    setViewport(normalized);
    setCursorIndex((current) =>
      Math.min(Math.max(current, normalized.start), normalized.start + normalized.count - 1),
    );
  };

  const zoom = (factor: number): void => {
    const nextViewport = zoomViewport(viewport, factor, candles.length, cursorIndex);
    updateViewport(nextViewport);
    setLiveMessage(
      `Chart zoomed ${factor < 1 ? 'in' : 'out'} to ${nextViewport.count} visible candles.`,
    );
  };

  const pan = (delta: number): void => {
    const nextViewport = panViewport(viewport, delta, candles.length);
    updateViewport(nextViewport);
    setLiveMessage(`Chart panned to ${delta < 0 ? 'earlier' : 'later'} data.`);
  };

  const reset = (): void => {
    setViewport(createFullViewport(candles.length));
    setCursorIndex(Math.max(0, candles.length - 1));
    setLiveMessage('Chart view reset.');
  };

  const panStep = Math.max(1, Math.round(viewport.count * 0.12));

  return (
    <section aria-labelledby="price-chart-title" className="min-w-0 border border-cabinet-border bg-cabinet-surface/55">
      <div className="border-b border-cabinet-border p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cabinet-brass">
              {quote.symbol} · {quote.exchange} · {formatDataSource(quote.source)}
            </p>
            <h2 className="mt-1 font-serif text-2xl text-cabinet-text sm:text-3xl" id="price-chart-title">
              {quote.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xl font-semibold text-cabinet-text">
                {formatPrice(quote.price, quote.currency)}
              </span>
              <span className={quote.changePercent >= 0 ? 'font-mono text-sm text-cabinet-positive' : 'font-mono text-sm text-cabinet-negative'}>
                {quote.changePercent >= 0 ? 'Up ' : 'Down '}{formatPercent(quote.changePercent)}
              </span>
              <span className="font-mono text-xs text-cabinet-muted">
                Vol {formatCompactNumber(quote.volume)}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-6 text-cabinet-muted">
          시세 기준 {formatSourceTime(quote.updatedAt)} · {marketSessionLabel(quote)} · {marketDelayLabel(quote.delayMinutes)}<br />
          시세 수신 {formatSourceTime(quote.fetchedAt)} · 마지막 확인 {formatSourceTime(lastCheckedAt)}<br />
          차트 {formatDataSource(chartSource)} · {marketDelayLabel(chartDelayMinutes)} · 마지막 봉 {formatSourceTime(candles.at(-1) ? new Date(candles.at(-1)!.timestamp).toISOString() : null)}<br />
          차트는 정규장 데이터입니다. 제공처와 거래 시간에 따라 위 시세와 다를 수 있습니다.
        </p>
        <div className="mt-4">
          <ChartControls
            onPanEarlier={() => pan(-panStep)}
            onPanLater={() => pan(panStep)}
            onRangeChange={onRangeChange}
            onReset={reset}
            onZoomIn={() => zoom(0.76)}
            onZoomOut={() => zoom(1.32)}
            range={range}
          />
        </div>
      </div>

      <ChartCanvas
        candles={candles}
        cursorIndex={cursorIndex}
        indicators={indicators}
        liveMessage={liveMessage}
        onCursorChange={setCursorIndex}
        onLiveMessageChange={setLiveMessage}
        onPan={pan}
        onReset={reset}
        onViewportChange={updateViewport}
        onZoom={zoom}
        quote={quote}
        range={range}
        viewport={viewport}
      />

      {selectedCandle ? (
        <ChartDataPanel
          candle={selectedCandle}
          cursorIndex={cursorIndex}
          indicators={indicators}
          quote={quote}
          range={range}
        />
      ) : null}
    </section>
  );
}
