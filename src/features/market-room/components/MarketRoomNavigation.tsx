import { useRef, type KeyboardEvent } from 'react';

export const MARKET_ROOM_VIEWS = ['research', 'news', 'themes', 'memo'] as const;
export type MarketRoomView = (typeof MARKET_ROOM_VIEWS)[number];

const VIEW_LABELS: Record<MarketRoomView, { label: string; eyebrow: string }> = {
  research: { label: '시세·분석', eyebrow: 'Market desk' },
  news: { label: '뉴스', eyebrow: 'News brief' },
  themes: { label: '테마', eyebrow: 'Theme map' },
  memo: { label: '투자 메모', eyebrow: 'Private ledger' },
};

interface MarketRoomNavigationProps {
  activeView: MarketRoomView;
  onChange: (view: MarketRoomView) => void;
}

export function MarketRoomNavigation({
  activeView,
  onChange,
}: MarketRoomNavigationProps): React.JSX.Element {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % MARKET_ROOM_VIEWS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + MARKET_ROOM_VIEWS.length) % MARKET_ROOM_VIEWS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = MARKET_ROOM_VIEWS.length - 1;
    }

    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const nextView = MARKET_ROOM_VIEWS[nextIndex];
    onChange(nextView);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <nav
      aria-label="Market Room sections"
      className="mb-6 grid grid-cols-2 border border-cabinet-border bg-cabinet-surface/45 sm:grid-cols-4"
      role="tablist"
    >
      {MARKET_ROOM_VIEWS.map((view, index) => {
        const active = view === activeView;
        const labels = VIEW_LABELS[view];
        return (
          <button
            aria-controls={`market-room-panel-${view}`}
            aria-selected={active}
            className={`min-h-16 border-b border-r border-cabinet-border px-3 py-2 text-left last:border-r-0 sm:border-b-0 ${
              active
                ? 'border-t-2 border-t-cabinet-brass bg-cabinet-elevated text-cabinet-text'
                : 'border-t-2 border-t-transparent text-cabinet-muted hover:bg-cabinet-elevated/60 hover:text-cabinet-text'
            }`}
            id={`market-room-tab-${view}`}
            key={view}
            onClick={() => onChange(view)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            <span className="block text-[0.56rem] font-bold uppercase tracking-[0.18em] text-cabinet-brass">
              {labels.eyebrow}
            </span>
            <span className="mt-1 block text-xs font-semibold">{labels.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
