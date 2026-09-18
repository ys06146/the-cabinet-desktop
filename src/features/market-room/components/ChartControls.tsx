import { CHART_RANGES, type ChartRange } from '../../../domain/market';

interface ChartControlsProps {
  onPanEarlier: () => void;
  onPanLater: () => void;
  onRangeChange: (range: ChartRange) => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  range: ChartRange;
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      aria-label={label}
      className="min-h-11 rounded-cabinet-sm border border-cabinet-border bg-cabinet-background/45 px-3 font-mono text-xs text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function ChartControls({
  onPanEarlier,
  onPanLater,
  onRangeChange,
  onReset,
  onZoomIn,
  onZoomOut,
  range,
}: ChartControlsProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div aria-label="Chart range" className="flex flex-wrap gap-1" role="group">
        {CHART_RANGES.map((candidate) => (
          <button
            aria-pressed={range === candidate}
            className={`min-h-11 min-w-11 rounded-cabinet-sm border px-2 font-mono text-xs ${
              range === candidate
                ? 'border-cabinet-brass bg-cabinet-accent text-cabinet-text'
                : 'border-cabinet-border bg-cabinet-background/45 text-cabinet-muted hover:text-cabinet-text'
            }`}
            data-chart-range={candidate}
            key={candidate}
            onClick={() => onRangeChange(candidate)}
            type="button"
          >
            {candidate}
          </button>
        ))}
      </div>
      <div aria-label="Chart navigation" className="flex flex-wrap gap-1.5" role="group">
        <ControlButton label="Zoom in" onClick={onZoomIn}>Zoom +</ControlButton>
        <ControlButton label="Zoom out" onClick={onZoomOut}>Zoom −</ControlButton>
        <ControlButton label="Pan to earlier data" onClick={onPanEarlier}>← Earlier</ControlButton>
        <ControlButton label="Pan to later data" onClick={onPanLater}>Later →</ControlButton>
        <ControlButton label="Reset chart view" onClick={onReset}>Reset</ControlButton>
      </div>
    </div>
  );
}

