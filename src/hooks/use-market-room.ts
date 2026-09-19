import { useCallback, useEffect, useState } from 'react';
import { marketRoomService } from '../app/services/market-room-service';
import type { ChartRange } from '../domain/market';
import { usePollingResource } from './use-polling-resource';

const MARKET_REFRESH_MS = 60_000;
const loadOverview = () => marketRoomService.loadOverview();

export function useMarketRoom() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [range, setRange] = useState<ChartRange>('1M');
  const overview = usePollingResource(loadOverview, MARKET_REFRESH_MS);
  const loadResearch = useCallback(
    () => marketRoomService.loadResearch(selectedSymbol!, range),
    [range, selectedSymbol],
  );
  const research = usePollingResource(selectedSymbol ? loadResearch : null, MARKET_REFRESH_MS);

  useEffect(() => {
    if (overview.data) setSelectedSymbol((current) => current ?? overview.data!.watchlist[0]?.symbol ?? null);
  }, [overview.data]);

  const refreshOverview = overview.refresh;
  const refreshResearch = research.refresh;
  const refresh = useCallback(() => {
    refreshOverview();
    refreshResearch();
  }, [refreshOverview, refreshResearch]);

  return {
    overview, research, selectedSymbol, range, refresh,
    retryOverview: overview.refresh,
    retryResearch: research.refresh,
    selectRange: setRange,
    selectSymbol: setSelectedSymbol,
  };
}

export type MarketRoomState = ReturnType<typeof useMarketRoom>;
export type MarketRoomLoadStatus = MarketRoomState['overview']['status'];
