import type {
  AnalysisObservation,
  MarketAnalysis,
  PriceZone,
} from '../../../domain/market-analysis';
import type { StockQuote } from '../../../domain/market';
import { formatDataSource, formatPrice } from '../market-formatters';

interface AnalysisPanelProps {
  analysis: MarketAnalysis;
  quote: StockQuote;
  chartSource?: 'yahoo' | 'mock';
}

const TONE_STYLES: Record<AnalysisObservation['tone'], string> = {
  positive: 'text-cabinet-positive',
  negative: 'text-cabinet-negative',
  neutral: 'text-cabinet-muted',
  warning: 'text-cabinet-warning',
};

function Observation({
  label,
  observation,
}: {
  label: string;
  observation: AnalysisObservation;
}): React.JSX.Element {
  return (
    <article className="border-b border-cabinet-border px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">
          {label}
        </h3>
        <p className={`font-mono text-xs font-semibold ${TONE_STYLES[observation.tone]}`}>
          {observation.state}
        </p>
      </div>
      <p className="mt-2 text-xs leading-5 text-cabinet-muted">{observation.detail}</p>
    </article>
  );
}

function formatZone(zone: PriceZone | null, quote: StockQuote): string {
  if (!zone) {
    return 'Not available';
  }
  return `${formatPrice(zone.low, quote.currency)} – ${formatPrice(zone.high, quote.currency)}`;
}

export function AnalysisPanel({ analysis, quote, chartSource = 'yahoo' }: AnalysisPanelProps): React.JSX.Element {
  return (
    <aside aria-labelledby="analysis-title" className="border border-cabinet-border bg-cabinet-surface/55">
      <div className="border-b border-cabinet-border px-4 py-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
          Rules desk
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-2xl text-cabinet-text" id="analysis-title">
            Analysis
          </h2>
          <span className="font-mono text-[0.62rem] uppercase tracking-wider text-cabinet-muted">
            차트 계산 · {formatDataSource(chartSource)}
          </span>
        </div>
      </div>

      <div>
        <Observation label="Trend" observation={analysis.trend} />
        <Observation label="Momentum" observation={analysis.momentum} />
        <Observation label="Moving-average alignment" observation={analysis.movingAverageAlignment} />
        <Observation label="Volume change" observation={analysis.volumeChange} />
        <Observation label="RSI state" observation={analysis.rsiState} />
      </div>

      <section aria-labelledby="price-zones-title" className="border-t border-cabinet-border px-4 py-4">
        <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted" id="price-zones-title">
          Simple price zones
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="border-l-2 border-l-cabinet-positive pl-3">
            <dt className="text-[0.6rem] uppercase tracking-wider text-cabinet-muted">Support</dt>
            <dd className="mt-1 font-mono text-xs text-cabinet-text">{formatZone(analysis.support, quote)}</dd>
          </div>
          <div className="border-l-2 border-l-cabinet-negative pl-3">
            <dt className="text-[0.6rem] uppercase tracking-wider text-cabinet-muted">Resistance</dt>
            <dd className="mt-1 font-mono text-xs text-cabinet-text">{formatZone(analysis.resistance, quote)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="scenarios-title" className="border-t border-cabinet-border px-4 py-4">
        <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted" id="scenarios-title">
          Conditional scenarios
        </h3>
        <div className="mt-3 space-y-4">
          <div>
            <p className="font-serif text-base text-cabinet-positive">Constructive case</p>
            <p className="mt-1 text-xs leading-5 text-cabinet-muted">{analysis.positiveScenario}</p>
          </div>
          <div>
            <p className="font-serif text-base text-cabinet-negative">Adverse case</p>
            <p className="mt-1 text-xs leading-5 text-cabinet-muted">{analysis.negativeScenario}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="risk-title" className="border-t border-cabinet-border px-4 py-4">
        <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted" id="risk-title">
          Risk factors
        </h3>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-cabinet-muted">
          {analysis.riskFactors.map((factor) => (
            <li className="flex gap-2" key={factor}>
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-cabinet-warning" />
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="confidence-title" className="border-t border-cabinet-border px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted" id="confidence-title">
              Rule confidence
            </h3>
            <p className="mt-1 font-serif text-lg text-cabinet-text">{analysis.confidence.label}</p>
          </div>
          <p className="font-mono text-2xl text-cabinet-brass">{analysis.confidence.score}%</p>
        </div>
        <div
          aria-label={`Rule confidence ${analysis.confidence.score} percent`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={analysis.confidence.score}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-cabinet-background"
          role="progressbar"
        >
          <span
            className="block h-full bg-cabinet-brass"
            style={{ width: `${analysis.confidence.score}%` }}
          />
        </div>
        <p className="mt-3 text-[0.68rem] leading-5 text-cabinet-muted">
          {analysis.confidence.explanation}
        </p>
      </section>
    </aside>
  );
}
