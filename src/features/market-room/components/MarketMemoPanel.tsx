import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import type { MarketResearchPersistenceState } from '../../../hooks/use-market-research-data';
import type { MarketRoomState } from '../../../hooks/use-market-room';
import { InvestmentMemoEditor } from './InvestmentMemoEditor';

interface MarketMemoPanelProps {
  market: MarketRoomState;
  persistence: MarketResearchPersistenceState;
}

export function MarketMemoPanel({
  market,
  persistence,
}: MarketMemoPanelProps): React.JSX.Element {
  if (persistence.status === 'loading' || market.overview.status === 'loading') {
    return (
      <section className="border border-cabinet-border bg-cabinet-surface/45 p-5">
        <LoadingSkeleton label="저장된 투자 메모 불러오는 중" lines={7} />
      </section>
    );
  }

  if (persistence.status === 'error') {
    return (
      <ErrorMessage
        message={persistence.error ?? '저장된 연구 데이터를 불러오지 못했습니다.'}
        onRetry={persistence.retry}
        retryLabel="다시 불러오기"
        title="투자 메모를 열 수 없습니다"
      />
    );
  }

  if (market.overview.status === 'error') {
    return (
      <ErrorMessage
        message={market.overview.error ?? '종목 목록을 불러오지 못했습니다.'}
        onRetry={market.retryOverview}
        retryLabel="종목 다시 불러오기"
        title="메모 종목을 선택할 수 없습니다"
      />
    );
  }

  const watchlist = market.overview.data?.watchlist ?? [];
  const selectedQuote =
    watchlist.find((quote) => quote.symbol === market.selectedSymbol) ?? watchlist[0] ?? null;

  if (!selectedQuote) {
    return (
      <EmptyState
        description="메모를 연결할 관심 종목이 없습니다."
        title="선택 가능한 종목이 없습니다"
      />
    );
  }

  const symbol = selectedQuote.symbol;
  const memo = persistence.getMemo(symbol);

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 border border-cabinet-border bg-cabinet-surface/45 px-4 py-4 sm:px-5">
        <div>
          <label
            className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass"
            htmlFor="investment-memo-symbol"
          >
            메모 종목
          </label>
          <p className="mt-1 text-xs leading-5 text-cabinet-muted">
            관심 종목마다 독립된 판단 기록을 유지합니다.
          </p>
        </div>
        <select
          className="min-h-11 w-full rounded-cabinet-sm border border-cabinet-border bg-cabinet-background px-3 font-mono text-sm text-cabinet-text sm:w-auto sm:min-w-56"
          id="investment-memo-symbol"
          onChange={(event) => market.selectSymbol(event.target.value)}
          value={symbol}
        >
          {watchlist.map((quote) => (
            <option key={quote.symbol} value={quote.symbol}>
              {quote.name} · {quote.symbol}
            </option>
          ))}
        </select>
      </section>

      <InvestmentMemoEditor
        companyName={selectedQuote.name}
        dataVersion={persistence.data.dataVersion}
        hasUnsavedDrafts={persistence.hasUnsavedDrafts}
        isExporting={persistence.isExporting}
        isImporting={persistence.isImporting}
        lastSavedAt={persistence.getMemoSavedAt(symbol)}
        memo={memo}
        onChange={(nextMemo) => persistence.setMemoDraft(symbol, nextMemo)}
        onExportJson={() => void persistence.exportJson()}
        onImportJson={() => void persistence.importJson()}
        onSave={() => void persistence.saveMemo(symbol)}
        saveState={persistence.getMemoSaveState(symbol)}
        statusMessage={persistence.statusMessage}
        statusMessageTone={persistence.statusMessageTone}
        symbol={symbol}
      />
    </div>
  );
}
