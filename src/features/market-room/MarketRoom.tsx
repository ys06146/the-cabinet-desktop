import { useState } from 'react';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useMarketContent } from '../../hooks/use-market-content';
import { useMarketResearchData } from '../../hooks/use-market-research-data';
import { useMarketRoom } from '../../hooks/use-market-room';
import { MarketMemoPanel } from './components/MarketMemoPanel';
import {
  MARKET_ROOM_VIEWS,
  MarketRoomNavigation,
  type MarketRoomView,
} from './components/MarketRoomNavigation';
import { MarketResearchDesk } from './components/MarketResearchDesk';
import { NewsDesk } from './components/NewsDesk';
import { ThemeExplorer } from './components/ThemeExplorer';

const RESEARCH_DISCLAIMER =
  '시세는 제공처와 거래 시간에 따라 지연될 수 있습니다. 분석은 가격 데이터의 규칙 기반 계산이며 투자 권유 또는 매매 신호가 아닙니다.';

function ContentSkeleton({ label }: { label: string }): React.JSX.Element {
  return (
    <section className="border border-cabinet-border bg-cabinet-surface/45 p-5">
      <LoadingSkeleton label={label} lines={8} />
    </section>
  );
}

export function MarketRoom(): React.JSX.Element {
  const market = useMarketRoom();
  const persistence = useMarketResearchData();
  const content = useMarketContent(persistence.data.savedNewsIds);
  const [activeView, setActiveView] = useState<MarketRoomView>('research');

  const renderActiveView = (): React.JSX.Element => {
    switch (activeView) {
      case 'research':
        return <MarketResearchDesk market={market} />;
      case 'news':
        return (
          <NewsDesk
            activeFilter={content.activeNewsFilter}
            detail={content.newsDetail.data}
            detailError={content.newsDetail.error}
            isDetailLoading={content.newsDetail.status === 'loading'}
            isListLoading={content.news.status === 'loading'}
            items={content.news.data}
            listError={content.news.error}
            lastCheckedAt={content.news.lastCheckedAt}
            onCloseDetail={content.closeNewsDetail}
            onFilterChange={content.setNewsFilter}
            onRetryDetail={content.retryNewsDetail}
            onRetryList={content.retryNews}
            onSelectNews={content.selectNews}
            onToggleSaved={(newsId) => {
              const item = content.news.data.find((candidate) => candidate.id === newsId);
              if (item) {
                void persistence.setNewsSaved(newsId, !item.isSaved);
              }
            }}
            selectedNewsId={content.selectedNewsId}
          />
        );
      case 'themes':
        if (content.themes.status === 'loading') {
          return <ContentSkeleton label="투자 테마 지도 불러오는 중" />;
        }
        if (content.themes.status === 'error') {
          return (
            <ErrorMessage
              message={content.themes.error ?? '목업 테마를 불러오지 못했습니다.'}
              onRetry={content.retryThemes}
              retryLabel="테마 다시 불러오기"
              title="테마 탐색을 열 수 없습니다"
            />
          );
        }
        return (
          <ThemeExplorer
            onSelectTheme={content.selectTheme}
            selectedThemeId={content.selectedThemeId}
            themes={content.themes.data}
          />
        );
      case 'memo':
        return <MarketMemoPanel market={market} persistence={persistence} />;
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1600px] px-3 py-7 sm:px-6 sm:py-9 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-cabinet-border pb-5">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-cabinet-brass">
            Market Room · Research
          </p>
          <h2 className="mt-2 font-serif text-3xl text-cabinet-text sm:text-4xl">
            A measured view of the market.
          </h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-cabinet-muted sm:text-right">
          시세는 1분, 뉴스는 5분마다 확인합니다. 출처의 제공 시각과 수신 시각을 함께 확인하세요.
        </p>
      </header>

      <MarketRoomNavigation activeView={activeView} onChange={setActiveView} />

      {persistence.statusMessage && activeView !== 'memo' ? (
        <p
          className={`mb-4 border-l-2 px-3 py-2 text-xs leading-5 ${
            persistence.statusMessageTone === 'error'
              ? 'border-cabinet-negative bg-cabinet-negative/5 text-cabinet-negative'
              : persistence.statusMessageTone === 'warning'
                ? 'border-cabinet-warning bg-cabinet-warning/5 text-cabinet-warning'
                : 'border-cabinet-brass bg-cabinet-surface text-cabinet-muted'
          }`}
          role={persistence.statusMessageTone === 'error' ? 'alert' : 'status'}
        >
          {persistence.statusMessage}
        </p>
      ) : null}

      {MARKET_ROOM_VIEWS.map((view) => (
        <div
          aria-labelledby={`market-room-tab-${view}`}
          hidden={view !== activeView}
          id={`market-room-panel-${view}`}
          key={view}
          role="tabpanel"
          tabIndex={view === activeView ? 0 : undefined}
        >
          {view === activeView ? renderActiveView() : null}
        </div>
      ))}

      <footer className="mt-8 border-y border-cabinet-border bg-cabinet-surface/35 px-4 py-4 text-center text-xs leading-6 text-cabinet-muted">
        {RESEARCH_DISCLAIMER}
      </footer>
    </section>
  );
}

export { RESEARCH_DISCLAIMER };
