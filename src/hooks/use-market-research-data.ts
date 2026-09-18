import { useCallback, useEffect, useRef, useState } from 'react';
import { marketResearchDataService } from '../app/services/market-research-data-service';
import { updateSaveCoordinator } from '../app/services/update-save-coordinator';
import {
  createEmptyMarketResearchData,
  normalizeMarketSymbol,
  type InvestmentMemo,
  type MarketResearchDataV1,
} from '../domain/market-research-data';
import { reportApplicationError } from '../lib/report-error';

export type ResearchDataLoadStatus = 'loading' | 'ready' | 'error';
export type InvestmentMemoSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type ResearchOperationTone = 'info' | 'warning' | 'error';

export const EMPTY_INVESTMENT_MEMO: InvestmentMemo = Object.freeze({
  interestReason: '',
  positiveThesis: '',
  negativeThesis: '',
  numbersToVerify: '',
  reviewCondition: '',
  invalidationCondition: '',
  nextReviewDate: null,
});

export interface MarketResearchPersistenceState {
  data: MarketResearchDataV1;
  error: string | null;
  exportJson: () => Promise<void>;
  getMemo: (symbol: string) => InvestmentMemo;
  getMemoSaveState: (symbol: string) => InvestmentMemoSaveState;
  getMemoSavedAt: (symbol: string) => string | null;
  hasUnsavedDrafts: boolean;
  importJson: () => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
  retry: () => void;
  saveMemo: (symbol: string) => Promise<void>;
  setMemoDraft: (symbol: string, memo: InvestmentMemo) => void;
  setNewsSaved: (newsId: string, isSaved: boolean) => Promise<void>;
  status: ResearchDataLoadStatus;
  statusMessage: string | null;
  statusMessageTone: ResearchOperationTone;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useMarketResearchData(): MarketResearchPersistenceState {
  const [data, setData] = useState<MarketResearchDataV1>(createEmptyMarketResearchData);
  const [status, setStatus] = useState<ResearchDataLoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [memoDrafts, setMemoDrafts] = useState<Record<string, InvestmentMemo>>({});
  const memoDraftsRef = useRef<Record<string, InvestmentMemo>>({});
  const [memoSaveStates, setMemoSaveStates] = useState<
    Record<string, InvestmentMemoSaveState>
  >({});
  const [memoSavedAt, setMemoSavedAt] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusMessageTone, setStatusMessageTone] =
    useState<ResearchOperationTone>('info');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    marketResearchDataService
      .load()
      .then((loaded) => {
        if (!active) return;
        setData(loaded);
        setStatus('ready');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        reportApplicationError(loadError);
        setError(messageFrom(loadError, '저장된 연구 데이터를 불러오지 못했습니다.'));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [revision]);

  const getMemo = useCallback(
    (symbol: string): InvestmentMemo => {
      const normalized = normalizeMarketSymbol(symbol);
      return (
        memoDrafts[normalized] ??
        data.investmentMemos[normalized] ??
        EMPTY_INVESTMENT_MEMO
      );
    },
    [data.investmentMemos, memoDrafts],
  );

  const setMemoDraft = useCallback((symbol: string, memo: InvestmentMemo) => {
    const normalized = normalizeMarketSymbol(symbol);
    setMemoDrafts((current) => {
      const next = { ...current, [normalized]: memo };
      memoDraftsRef.current = next;
      return next;
    });
    setMemoSaveStates((current) => ({ ...current, [normalized]: 'dirty' }));
    setStatusMessage(null);
    setStatusMessageTone('info');
  }, []);

  const flushDirtyMemos = useCallback(async (): Promise<void> => {
    const draftsToSave = Object.entries(memoDraftsRef.current);
    for (const [symbol, memo] of draftsToSave) {
      if (mountedRef.current) {
        setMemoSaveStates((current) => ({ ...current, [symbol]: 'saving' }));
      }
      try {
        const saved = await marketResearchDataService.saveInvestmentMemo(symbol, memo);
        const savedAt = new Date().toISOString();
        const latestDraft = memoDraftsRef.current[symbol];
        const hasNewerDraft = latestDraft !== undefined && latestDraft !== memo;
        if (!hasNewerDraft) {
          const nextDrafts = { ...memoDraftsRef.current };
          delete nextDrafts[symbol];
          memoDraftsRef.current = nextDrafts;
        }
        if (mountedRef.current) {
          setData(saved);
          setMemoDrafts((current) => {
            if (current[symbol] !== memo) return current;
            const next = { ...current };
            delete next[symbol];
            return next;
          });
          setMemoSaveStates((current) => ({
            ...current,
            [symbol]: hasNewerDraft ? 'dirty' : 'saved',
          }));
          setMemoSavedAt((current) => ({ ...current, [symbol]: savedAt }));
        }
      } catch (saveError: unknown) {
        reportApplicationError(saveError);
        if (mountedRef.current) {
          setMemoSaveStates((current) => ({ ...current, [symbol]: 'error' }));
          setStatusMessage('투자 메모를 저장하지 못했습니다.');
          setStatusMessageTone('error');
        }
        throw saveError;
      }
    }
    if (Object.keys(memoDraftsRef.current).length > 0) {
      throw new Error('저장 중 메모가 변경되었습니다.');
    }
  }, []);

  useEffect(
    () =>
      updateSaveCoordinator.register(
        'market-research-memo-drafts',
        '투자 메모',
        flushDirtyMemos,
      ),
    [flushDirtyMemos],
  );

  const saveMemo = useCallback(
    async (symbol: string): Promise<void> => {
      const normalized = normalizeMarketSymbol(symbol);
      const memo =
        memoDrafts[normalized] ??
        data.investmentMemos[normalized] ??
        EMPTY_INVESTMENT_MEMO;
      setMemoSaveStates((current) => ({ ...current, [normalized]: 'saving' }));
      setStatusMessage(null);
      setStatusMessageTone('info');

      try {
        const saved = await marketResearchDataService.saveInvestmentMemo(normalized, memo);
        const savedAt = new Date().toISOString();
        setData(saved);
        const hasNewerDraft =
          memoDraftsRef.current[normalized] !== undefined &&
          memoDraftsRef.current[normalized] !== memo;
        if (!hasNewerDraft) {
          setMemoDrafts((current) => {
            const next = { ...current };
            delete next[normalized];
            memoDraftsRef.current = next;
            return next;
          });
        }
        setMemoSaveStates((current) => ({
          ...current,
          [normalized]: hasNewerDraft ? 'dirty' : 'saved',
        }));
        setMemoSavedAt((current) => ({ ...current, [normalized]: savedAt }));
        setStatusMessage(
          hasNewerDraft
            ? `${normalized}의 저장 당시 내용은 보존됐지만 이후 편집은 아직 저장되지 않았습니다.`
            : `${normalized} 메모를 사용자 데이터 위치에 저장했습니다.`,
        );
        setStatusMessageTone(hasNewerDraft ? 'warning' : 'info');
      } catch (saveError) {
        reportApplicationError(saveError);
        setMemoSaveStates((current) => ({ ...current, [normalized]: 'error' }));
        setStatusMessage(messageFrom(saveError, '투자 메모를 저장하지 못했습니다.'));
        setStatusMessageTone('error');
      }
    },
    [data.investmentMemos, memoDrafts],
  );

  const setNewsSaved = useCallback(
    async (newsId: string, isSaved: boolean): Promise<void> => {
      try {
        const saved = await marketResearchDataService.setNewsSaved(newsId, isSaved);
        setData(saved);
        setStatusMessage(isSaved ? '뉴스를 저장했습니다.' : '뉴스 저장을 해제했습니다.');
        setStatusMessageTone('info');
      } catch (saveError) {
        reportApplicationError(saveError);
        setStatusMessage(messageFrom(saveError, '뉴스 저장 상태를 변경하지 못했습니다.'));
        setStatusMessageTone('error');
      }
    },
    [],
  );

  const exportJson = useCallback(async (): Promise<void> => {
    if (Object.keys(memoDraftsRef.current).length > 0) {
      setStatusMessage('JSON 내보내기 전에 모든 메모 변경을 저장해 주세요.');
      setStatusMessageTone('warning');
      return;
    }
    setIsExporting(true);
    setStatusMessage(null);
    setStatusMessageTone('info');
    try {
      const result = await marketResearchDataService.exportJson();
      if (result.status === 'exported') {
        setStatusMessage(
          `메모 ${result.investmentMemoCount}개와 저장 뉴스 ${result.savedNewsCount}개를 JSON으로 내보냈습니다.`,
        );
      }
    } catch (exportError) {
      reportApplicationError(exportError);
      setStatusMessage(messageFrom(exportError, '연구 데이터를 내보내지 못했습니다.'));
      setStatusMessageTone('error');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importJson = useCallback(async (): Promise<void> => {
    if (Object.keys(memoDraftsRef.current).length > 0) {
      setStatusMessage('JSON 가져오기 전에 모든 메모 변경을 저장해 주세요.');
      setStatusMessageTone('warning');
      return;
    }
    setIsImporting(true);
    setStatusMessage(null);
    setStatusMessageTone('info');
    try {
      const result = await marketResearchDataService.importJson();
      if (result.status === 'imported') {
        setData(result.data);
        setStatusMessage(
          `검증된 메모 ${result.investmentMemoCount}개와 저장 뉴스 ${result.savedNewsCount}개를 병합했습니다. 기존 종목 메모는 유지됩니다.`,
        );
      }
    } catch (importError) {
      reportApplicationError(importError);
      setStatusMessage(messageFrom(importError, '연구 데이터를 가져오지 못했습니다.'));
      setStatusMessageTone('error');
    } finally {
      setIsImporting(false);
    }
  }, []);

  return {
    data,
    error,
    exportJson,
    getMemo,
    getMemoSaveState: (symbol) =>
      memoSaveStates[normalizeMarketSymbol(symbol)] ?? 'idle',
    getMemoSavedAt: (symbol) => memoSavedAt[normalizeMarketSymbol(symbol)] ?? null,
    hasUnsavedDrafts: Object.keys(memoDrafts).length > 0,
    importJson,
    isExporting,
    isImporting,
    retry: () => setRevision((current) => current + 1),
    saveMemo,
    setMemoDraft,
    setNewsSaved,
    status,
    statusMessage,
    statusMessageTone,
  };
}
