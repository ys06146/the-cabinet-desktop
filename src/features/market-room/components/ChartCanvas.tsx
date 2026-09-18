import {
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import {
  clientXToDataIndex,
  createPriceDomain,
  mapValueToY,
  panViewport,
  type ChartViewport,
} from '../../../domain/chart-geometry';
import type { ChartRange, OHLCV, StockQuote } from '../../../domain/market';
import type { TechnicalIndicators } from '../../../domain/market-indicators';
import { formatChartTimestamp, formatPrice } from '../market-formatters';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  MACD_HEIGHT,
  MACD_TOP,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_WIDTH,
  PRICE_HEIGHT,
  PRICE_TOP,
  VOLUME_HEIGHT,
  VOLUME_TOP,
  createIndicatorLinePath,
  createPriceLinePath,
} from './chart-rendering';

interface ChartCanvasProps {
  candles: readonly OHLCV[];
  cursorIndex: number;
  indicators: TechnicalIndicators;
  liveMessage: string;
  onCursorChange: (index: number) => void;
  onLiveMessageChange: (message: string) => void;
  onPan: (delta: number) => void;
  onReset: () => void;
  onViewportChange: (viewport: ChartViewport) => void;
  onZoom: (factor: number) => void;
  quote: StockQuote;
  range: ChartRange;
  viewport: ChartViewport;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  viewport: ChartViewport;
}

function PriceGrid({
  currency,
  domain,
}: {
  currency: StockQuote['currency'];
  domain: { min: number; max: number };
}): React.JSX.Element {
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = PRICE_TOP + ratio * PRICE_HEIGHT;
        const value = domain.max - ratio * (domain.max - domain.min);
        return (
          <g key={ratio}>
            <line className="stroke-cabinet-border/70" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} />
            <text className="fill-cabinet-muted font-mono text-[11px]" x={PLOT_RIGHT + 10} y={y + 4}>
              {currency === 'KRW' ? Math.round(value).toLocaleString('ko-KR') : value.toFixed(2)}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function ChartCanvas({
  candles,
  cursorIndex,
  indicators,
  liveMessage,
  onCursorChange,
  onLiveMessageChange,
  onPan,
  onReset,
  onViewportChange,
  onZoom,
  quote,
  range,
  viewport,
}: ChartCanvasProps): React.JSX.Element {
  const descriptionId = useId();
  const clipId = `market-plot-${useId().replaceAll(':', '')}`;
  const dragState = useRef<DragState | null>(null);
  const visibleCandles = useMemo(
    () => candles.slice(viewport.start, viewport.start + viewport.count),
    [candles, viewport],
  );
  const priceDomain = useMemo(() => createPriceDomain(visibleCandles), [visibleCandles]);
  const maximumVolume = Math.max(1, ...visibleCandles.map((candle) => candle.volume));
  const slotWidth = PLOT_WIDTH / Math.max(1, viewport.count);
  const candleWidth = Math.min(10, Math.max(1.2, slotWidth * 0.58));
  const selectedCandle = candles[cursorIndex] ?? candles.at(-1) ?? null;
  const cursorLocalIndex = cursorIndex - viewport.start;
  const cursorVisible = cursorLocalIndex >= 0 && cursorLocalIndex < viewport.count;
  const cursorX = PLOT_LEFT + (cursorLocalIndex + 0.5) * slotWidth;
  const cursorY = selectedCandle
    ? mapValueToY(selectedCandle.close, priceDomain, PRICE_TOP, PRICE_HEIGHT)
    : PRICE_TOP;
  const periodHigh = Math.max(...candles.map((candle) => candle.high));
  const periodLow = Math.min(...candles.map((candle) => candle.low));

  const visibleMacd = [
    ...indicators.macd.macd.slice(viewport.start, viewport.start + viewport.count),
    ...indicators.macd.signal.slice(viewport.start, viewport.start + viewport.count),
    ...indicators.macd.histogram.slice(viewport.start, viewport.start + viewport.count),
  ].filter((value): value is number => value !== null);
  const macdExtent = Math.max(1, ...visibleMacd.map((value) => Math.abs(value)));
  const macdY = (value: number): number =>
    MACD_TOP + ((macdExtent - value) / (macdExtent * 2)) * MACD_HEIGHT;
  const tickIndexes = Array.from(
    new Set([
      0,
      Math.floor((viewport.count - 1) / 3),
      Math.floor(((viewport.count - 1) * 2) / 3),
      viewport.count - 1,
    ]),
  ).filter((index) => index >= 0);

  const moveCursor = (delta: number): void => {
    const nextIndex = Math.min(
      viewport.start + viewport.count - 1,
      Math.max(viewport.start, cursorIndex + delta),
    );
    onCursorChange(nextIndex);
    const candle = candles[nextIndex];
    if (candle) {
      onLiveMessageChange(
        `${formatChartTimestamp(candle.timestamp, range)}, close ${formatPrice(candle.close, quote.currency)}.`,
      );
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      onPan(-Math.max(1, Math.round(viewport.count * 0.12)));
      onLiveMessageChange('Chart panned to earlier data.');
    } else if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault();
      onPan(Math.max(1, Math.round(viewport.count * 0.12)));
      onLiveMessageChange('Chart panned to later data.');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveCursor(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveCursor(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onCursorChange(viewport.start);
      onLiveMessageChange('Crosshair moved to the first visible candle.');
    } else if (event.key === 'End') {
      event.preventDefault();
      onCursorChange(viewport.start + viewport.count - 1);
      onLiveMessageChange('Crosshair moved to the last visible candle.');
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      onZoom(0.76);
    } else if (event.key === '-') {
      event.preventDefault();
      onZoom(1.32);
    } else if (event.key === '0') {
      event.preventDefault();
      onReset();
    }
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, startClientX: event.clientX, viewport };
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    const drag = dragState.current;
    if (drag?.pointerId === event.pointerId) {
      const svgDelta = ((drag.startClientX - event.clientX) / Math.max(1, rectangle.width)) * CHART_WIDTH;
      const candleDelta = svgDelta / (PLOT_WIDTH / Math.max(1, drag.viewport.count));
      onViewportChange(panViewport(drag.viewport, candleDelta, candles.length));
      return;
    }
    const svgX = ((event.clientX - rectangle.left) / Math.max(1, rectangle.width)) * CHART_WIDTH;
    const nextIndex = clientXToDataIndex(svgX, PLOT_LEFT, PLOT_WIDTH, viewport);
    if (nextIndex !== null) {
      onCursorChange(nextIndex);
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>): void => {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>): void => {
    if (event.ctrlKey) {
      event.preventDefault();
      onZoom(event.deltaY > 0 ? 1.18 : 0.84);
    }
  };

  return (
    <div
      aria-describedby={descriptionId}
      aria-label={`${quote.name}, ${range} candlestick chart. ${candles.length} data points. Latest close ${formatPrice(quote.price, quote.currency)}, period high ${formatPrice(periodHigh, quote.currency)}, period low ${formatPrice(periodLow, quote.currency)}.`}
      className="min-w-0 p-2 focus-visible:rounded-cabinet-sm sm:p-4"
      data-chart-visible-count={viewport.count}
      data-chart-visible-start={viewport.start}
      onKeyDown={handleKeyDown}
      role="group"
      tabIndex={0}
    >
      <p className="sr-only" id={descriptionId}>
        Use left and right arrows to inspect candles, Shift plus arrows to pan, plus and minus to zoom, and zero to reset.
      </p>
      <span aria-live="polite" className="sr-only">{liveMessage}</span>

      <svg
        aria-hidden="true"
        className="block h-auto w-full select-none [touch-action:pan-y]"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          if (!dragState.current) {
            onCursorChange(viewport.start + viewport.count - 1);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect height={MACD_TOP + MACD_HEIGHT - PRICE_TOP} width={PLOT_WIDTH} x={PLOT_LEFT} y={PRICE_TOP} />
          </clipPath>
        </defs>
        <PriceGrid currency={quote.currency} domain={priceDomain} />

        <g clipPath={`url(#${clipId})`}>
          {visibleCandles.map((candle, localIndex) => {
            const x = PLOT_LEFT + (localIndex + 0.5) * slotWidth;
            const openY = mapValueToY(candle.open, priceDomain, PRICE_TOP, PRICE_HEIGHT);
            const closeY = mapValueToY(candle.close, priceDomain, PRICE_TOP, PRICE_HEIGHT);
            const highY = mapValueToY(candle.high, priceDomain, PRICE_TOP, PRICE_HEIGHT);
            const lowY = mapValueToY(candle.low, priceDomain, PRICE_TOP, PRICE_HEIGHT);
            const rising = candle.close >= candle.open;
            const volumeBarHeight = (candle.volume / maximumVolume) * VOLUME_HEIGHT;
            return (
              <g
                className={rising ? 'stroke-cabinet-positive fill-cabinet-positive' : 'stroke-cabinet-negative fill-cabinet-negative'}
                key={candle.timestamp}
              >
                <line strokeWidth="1.2" x1={x} x2={x} y1={highY} y2={lowY} />
                <rect
                  height={Math.max(1.5, Math.abs(closeY - openY))}
                  width={candleWidth}
                  x={x - candleWidth / 2}
                  y={Math.min(openY, closeY)}
                />
                <rect
                  className="opacity-45"
                  height={volumeBarHeight}
                  width={Math.max(1, candleWidth)}
                  x={x - candleWidth / 2}
                  y={VOLUME_TOP + VOLUME_HEIGHT - volumeBarHeight}
                />
              </g>
            );
          })}

          <path d={createPriceLinePath(indicators.sma5, viewport, priceDomain)} fill="none" stroke="rgb(var(--color-brass))" strokeWidth="1.6" />
          <path d={createPriceLinePath(indicators.sma20, viewport, priceDomain)} fill="none" stroke="rgb(var(--color-warning))" strokeDasharray="5 4" strokeWidth="1.4" />
          <path d={createPriceLinePath(indicators.sma60, viewport, priceDomain)} fill="none" stroke="rgb(var(--color-text-muted))" strokeDasharray="2 5" strokeWidth="1.3" />

          <line className="stroke-cabinet-border" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={macdY(0)} y2={macdY(0)} />
          {visibleCandles.map((candle, localIndex) => {
            const histogram = indicators.macd.histogram[viewport.start + localIndex];
            if (histogram === null || histogram === undefined) {
              return null;
            }
            const x = PLOT_LEFT + (localIndex + 0.5) * slotWidth;
            const zeroY = macdY(0);
            return (
              <rect
                className={histogram >= 0 ? 'fill-cabinet-positive/60' : 'fill-cabinet-negative/60'}
                height={Math.max(1, Math.abs(zeroY - macdY(histogram)))}
                key={`macd-${candle.timestamp}`}
                width={Math.max(1, candleWidth)}
                x={x - candleWidth / 2}
                y={macdY(Math.max(0, histogram))}
              />
            );
          })}
          <path d={createIndicatorLinePath(indicators.macd.macd, viewport, macdY)} fill="none" stroke="rgb(var(--color-brass))" strokeWidth="1.4" />
          <path d={createIndicatorLinePath(indicators.macd.signal, viewport, macdY)} fill="none" stroke="rgb(var(--color-warning))" strokeWidth="1.3" />

          {cursorVisible && selectedCandle ? (
            <g>
              <line className="stroke-cabinet-text/65" strokeDasharray="4 4" x1={cursorX} x2={cursorX} y1={PRICE_TOP} y2={MACD_TOP + MACD_HEIGHT} />
              <line className="stroke-cabinet-text/50" strokeDasharray="4 4" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={cursorY} y2={cursorY} />
              <circle className="fill-cabinet-text stroke-cabinet-background" cx={cursorX} cy={cursorY} r="3.5" strokeWidth="2" />
            </g>
          ) : null}
        </g>

        <text className="fill-cabinet-muted text-[10px] font-bold uppercase tracking-[0.18em]" x={PLOT_LEFT} y={VOLUME_TOP - 9}>VOLUME</text>
        <text className="fill-cabinet-muted text-[10px] font-bold uppercase tracking-[0.18em]" x={PLOT_LEFT} y={MACD_TOP - 10}>MACD / SIGNAL / HISTOGRAM</text>
        {tickIndexes.map((localIndex) => {
          const candle = visibleCandles[localIndex];
          if (!candle) {
            return null;
          }
          const x = PLOT_LEFT + (localIndex + 0.5) * slotWidth;
          return (
            <text
              className="fill-cabinet-muted font-mono text-[10px]"
              key={`tick-${candle.timestamp}`}
              textAnchor={localIndex === 0 ? 'start' : localIndex === viewport.count - 1 ? 'end' : 'middle'}
              x={x}
              y={CHART_HEIGHT - 8}
            >
              {formatChartTimestamp(candle.timestamp, range)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

