import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MarketMemoPanel } from './MarketMemoPanel';
import type { MarketRoomState } from '../../../hooks/use-market-room';
import { EMPTY_INVESTMENT_MEMO, type MarketResearchPersistenceState } from '../../../hooks/use-market-research-data';

function persistenceFixture(): MarketResearchPersistenceState {
  return {
    data: { dataVersion: 1, investmentMemos: {}, savedNewsIds: [] },
    error: null, exportJson: vi.fn(async () => {}), importJson: vi.fn(async () => {}),
    getMemo: vi.fn(() => ({ ...EMPTY_INVESTMENT_MEMO, interestReason: 'Apple memo draft' })),
    getMemoSaveState: () => 'dirty', getMemoSavedAt: () => null,
    hasUnsavedDrafts: true, isExporting: false, isImporting: false,
    retry: vi.fn(), saveMemo: vi.fn(async () => {}), setMemoDraft: vi.fn(),
    setNewsSaved: vi.fn(async () => {}), status: 'ready',
    statusMessage: null, statusMessageTone: 'info',
  };
}

describe('memo identity during live quote refreshes', () => {
  for (const quoteStatus of ['ready', 'error'] as const) {
    it('keeps the chosen stock editable when quotes are ' + quoteStatus, () => {
      const persistence = persistenceFixture();
      const market = {
        selectedSymbol: 'AAPL',
        selectSymbol: vi.fn(),
        overview: {
          status: quoteStatus, data: quoteStatus === 'error' ? null : {
            summary: null, watchlist: [], warnings: ['AAPL unavailable'],
          },
          error: quoteStatus === 'error' ? 'Network unavailable' : null,
        },
      } as unknown as MarketRoomState;
      const html = renderToStaticMarkup(createElement(MarketMemoPanel, { market, persistence }));
      expect(persistence.getMemo).toHaveBeenCalledWith('AAPL');
      expect(persistence.getMemo).not.toHaveBeenCalledWith('005930.KS');
      expect(html).toContain('value="AAPL" selected=""');
      expect(html).toContain('Apple memo draft');
      expect(html).toContain('Apple');
    });
  }
});
