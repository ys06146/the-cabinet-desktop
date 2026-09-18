import { useCallback, useEffect, useRef, useState } from 'react';
import {
  marketRoomService,
  type MarketRoomOverview,
  type StockResearchSnapshot,
} from '../app/services/market-room-service';
import type { ChartRange } from '../domain/market';
import { reportApplicationError } from '../lib/report-error';

export type MarketRoomLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadableState<T> {
  data: T | null;
  error: string | null;
  status: MarketRoomLoadStatus;
}

export interface MarketRoomState {
  overview: LoadableState<MarketRoomOverview>;
  research: LoadableState<StockResearchSnapshot>;
  selectedSymbol: string | null;
  range: ChartRange;
  retryOverview: () => void;
  retryResearch: () => void;
  selectRange: (range: ChartRange) => void;
  selectSymbol: (symbol: string) => void;
}

const initialOverview: LoadableState<MarketRoomOverview> = {
  data: null,
  error: null,
  status: 'loading',
};

const initialResearch: LoadableState<StockResearchSnapshot> = {
  data: null,
  error: null,
  status: 'idle',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The mock market request could not be completed.';
}

export function useMarketRoom(): MarketRoomState {
  const [overview, setOverview] = useState(initialOverview);
  const [research, setResearch] = useState(initialResearch);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [range, setRange] = useState<ChartRange>('1M');
  const [overviewRevision, setOverviewRevision] = useState(0);
  const [researchRevision, setResearchRevision] = useState(0);
  const researchRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    setOverview((current) => ({ ...current, error: null, status: 'loading' }));

    marketRoomService
      .loadOverview()
      .then((data) => {
        if (!active) {
          return;
        }
        setOverview({ data, error: null, status: 'ready' });
        setSelectedSymbol((current) => current ?? data.watchlist[0]?.symbol ?? null);
      })
      .catch((error: unknown) => {
        if (active) {
          reportApplicationError(error);
          setOverview({ data: null, error: getErrorMessage(error), status: 'error' });
        }
      });

    return () => {
      active = false;
    };
  }, [overviewRevision]);

  useEffect(() => {
    if (!selectedSymbol) {
      setResearch(initialResearch);
      return;
    }

    const requestId = researchRequestId.current + 1;
    researchRequestId.current = requestId;
    setResearch((current) => ({ ...current, error: null, status: 'loading' }));

    marketRoomService
      .loadResearch(selectedSymbol, range)
      .then((data) => {
        if (researchRequestId.current === requestId) {
          setResearch({ data, error: null, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (researchRequestId.current === requestId) {
          reportApplicationError(error);
          setResearch({ data: null, error: getErrorMessage(error), status: 'error' });
        }
      });

    return () => {
      if (researchRequestId.current === requestId) {
        researchRequestId.current += 1;
      }
    };
  }, [range, researchRevision, selectedSymbol]);

  const retryOverview = useCallback(() => {
    setOverviewRevision((revision) => revision + 1);
  }, []);

  const retryResearch = useCallback(() => {
    setResearchRevision((revision) => revision + 1);
  }, []);

  const selectRange = useCallback((nextRange: ChartRange) => {
    setRange(nextRange);
  }, []);

  const selectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);

  return {
    overview,
    research,
    selectedSymbol,
    range,
    retryOverview,
    retryResearch,
    selectRange,
    selectSymbol,
  };
}

