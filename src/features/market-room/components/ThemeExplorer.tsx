import type {
  InvestmentTheme,
  ThemeId,
  ThemeMomentum,
  ThemeRelationLevel,
  ThemeRelatedStock,
} from '../../../domain/theme';

const RELATION_LABELS: Record<ThemeRelationLevel, string> = {
  core: '핵심 기업',
  'supply-chain': '공급망 기업',
  'indirect-beneficiary': '간접 수혜 기업',
};

const RELATION_LEVELS = Object.keys(RELATION_LABELS) as ThemeRelationLevel[];

const MOMENTUM_PRESENTATION: Record<ThemeMomentum, { label: string; className: string }> = {
  positive: { label: '긍정', className: 'text-cabinet-positive' },
  neutral: { label: '중립', className: 'text-cabinet-muted' },
  negative: { label: '부정', className: 'text-cabinet-negative' },
};

export interface ThemeExplorerProps {
  onSelectTheme: (themeId: ThemeId) => void;
  selectedThemeId: ThemeId | null;
  themes: readonly InvestmentTheme[];
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function ResearchList({ items, emptyLabel }: { items: readonly string[]; emptyLabel: string }): React.JSX.Element {
  if (items.length === 0) {
    return <p className="text-xs leading-5 text-cabinet-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2 text-xs leading-5 text-cabinet-muted">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-cabinet-brass" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface RegionalStock extends ThemeRelatedStock {
  regionLabel: 'KR' | 'US';
}

function RelationMap({ theme }: { theme: InvestmentTheme }): React.JSX.Element {
  const stocks: readonly RegionalStock[] = [
    ...theme.domesticStocks.map((stock) => ({ ...stock, regionLabel: 'KR' as const })),
    ...theme.usStocks.map((stock) => ({ ...stock, regionLabel: 'US' as const })),
  ];

  return (
    <section aria-labelledby="theme-relation-title" className="border-t border-cabinet-border px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">Relationship Map</p>
          <h3 className="mt-1 font-serif text-xl text-cabinet-text" id="theme-relation-title">
            관련 기업 관계도
          </h3>
        </div>
        <p className="text-[0.62rem] leading-5 text-cabinet-muted">정의된 세 수준만 표시합니다.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {RELATION_LEVELS.map((level, index) => {
          const relatedStocks = stocks.filter((stock) => stock.relation === level);
          return (
            <section
              aria-labelledby={`theme-relation-${level}`}
              className={`min-w-0 border border-cabinet-border bg-cabinet-background/35 p-3 ${
                index === 0 ? 'border-t-2 border-t-cabinet-brass' : ''
              }`}
              key={level}
            >
              <h4 className="text-xs font-bold text-cabinet-text" id={`theme-relation-${level}`}>
                {RELATION_LABELS[level]}
              </h4>
              {relatedStocks.length === 0 ? (
                <p className="mt-3 text-xs text-cabinet-muted">연결된 기업 없음</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {relatedStocks.map((stock) => (
                    <li className="min-w-0 border-l border-cabinet-border pl-2" key={`${stock.regionLabel}-${stock.symbol}`}>
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-cabinet-text">{stock.name}</span>
                        <span className="shrink-0 font-mono text-[0.58rem] text-cabinet-brass">{stock.regionLabel}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[0.6rem] text-cabinet-muted">{stock.symbol}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ThemeDetail({ theme }: { theme: InvestmentTheme }): React.JSX.Element {
  const interest = Math.max(0, Math.min(100, theme.recentInterest));
  const momentum = MOMENTUM_PRESENTATION[theme.shortTermMomentum];

  return (
    <article aria-labelledby="selected-theme-title" className="min-w-0 border border-cabinet-border bg-cabinet-surface/45">
      <header className="px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Theme Dossier
            </p>
            <h2 className="mt-1 font-serif text-2xl text-cabinet-text sm:text-3xl" id="selected-theme-title">
              {theme.name}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-cabinet-muted">{theme.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="border border-cabinet-brass/60 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-cabinet-brass">
              Mock
            </span>
            <p className="mt-2 font-mono text-[0.6rem] text-cabinet-muted">{formatUpdatedAt(theme.updatedAt)}</p>
          </div>
        </div>
      </header>

      <dl className="grid border-y border-cabinet-border sm:grid-cols-3">
        <div className="border-b border-cabinet-border px-4 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">최근 관심도</dt>
          <dd className="mt-2">
            <div className="flex items-end justify-between gap-3">
              <span className="font-serif text-xl text-cabinet-text">{interest}</span>
              <span className="font-mono text-[0.6rem] text-cabinet-muted">/ 100</span>
            </div>
            <div
              aria-label={`최근 관심도 ${interest}점`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={interest}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-cabinet-background"
              role="progressbar"
            >
              <span className="block h-full bg-cabinet-brass" style={{ width: `${interest}%` }} />
            </div>
          </dd>
        </div>
        <div className="border-b border-cabinet-border px-4 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">단기 모멘텀</dt>
          <dd className={`mt-2 font-serif text-xl ${momentum.className}`}>{momentum.label}</dd>
        </div>
        <div className="px-4 py-4">
          <dt className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">관련 뉴스 수</dt>
          <dd className="mt-2 font-mono text-xl text-cabinet-text">{theme.relatedNewsCount}</dd>
        </div>
      </dl>

      <div className="grid lg:grid-cols-2">
        <section aria-labelledby="theme-catalysts-title" className="border-b border-cabinet-border px-4 py-5 sm:px-5 lg:border-r">
          <h3 className="font-serif text-lg text-cabinet-positive" id="theme-catalysts-title">촉매</h3>
          <div className="mt-3">
            <ResearchList emptyLabel="등록된 촉매가 없습니다." items={theme.catalysts} />
          </div>
        </section>
        <section aria-labelledby="theme-risks-title" className="border-b border-cabinet-border px-4 py-5 sm:px-5">
          <h3 className="font-serif text-lg text-cabinet-negative" id="theme-risks-title">위험</h3>
          <div className="mt-3">
            <ResearchList emptyLabel="등록된 위험이 없습니다." items={theme.risks} />
          </div>
        </section>
      </div>

      <RelationMap theme={theme} />
    </article>
  );
}

export function ThemeExplorer({ onSelectTheme, selectedThemeId, themes }: ThemeExplorerProps): React.JSX.Element {
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? null;

  return (
    <section aria-labelledby="theme-explorer-title">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-cabinet-border pb-4">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">Ten Research Themes</p>
          <h2 className="mt-1 font-serif text-2xl text-cabinet-text" id="theme-explorer-title">테마 탐색</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-cabinet-muted">관심도와 모멘텀은 목업 데이터이며 매매 신호가 아닙니다.</p>
      </header>

      {themes.length === 0 ? (
        <div className="border border-cabinet-border bg-cabinet-surface/45 px-5 py-12 text-center">
          <p className="font-serif text-xl text-cabinet-text">표시할 테마가 없습니다</p>
          <p className="mt-2 text-sm text-cabinet-muted">Mock Theme Provider가 반환한 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label="투자 테마" className="grid grid-cols-2 border border-cabinet-border bg-cabinet-surface/45 sm:grid-cols-3 xl:block">
            {themes.map((theme) => {
              const active = theme.id === selectedThemeId;
              return (
                <button
                  aria-pressed={active}
                  className={`flex min-h-14 min-w-0 items-center justify-between gap-2 border-b border-r border-cabinet-border px-3 py-2 text-left last:border-b-0 sm:min-h-12 xl:border-r-0 ${
                    active
                      ? 'border-l-2 border-l-cabinet-brass bg-cabinet-elevated text-cabinet-text'
                      : 'border-l-2 border-l-transparent text-cabinet-muted hover:bg-cabinet-elevated/60 hover:text-cabinet-text'
                  }`}
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  type="button"
                >
                  <span className="truncate text-xs font-semibold">{theme.name}</span>
                  <span className="shrink-0 font-mono text-[0.58rem] text-cabinet-muted">{theme.relatedNewsCount}</span>
                </button>
              );
            })}
          </nav>

          {selectedTheme ? (
            <ThemeDetail theme={selectedTheme} />
          ) : (
            <div className="flex min-h-60 items-center justify-center border border-cabinet-border bg-cabinet-surface/45 px-5 py-12 text-center">
              <div>
                <p className="font-serif text-xl text-cabinet-text">살펴볼 테마를 선택하세요</p>
                <p className="mt-2 text-sm text-cabinet-muted">기업 관계와 촉매, 위험을 한곳에서 비교할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
