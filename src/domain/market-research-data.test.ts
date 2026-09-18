import { describe, expect, it } from 'vitest';
import {
  MARKET_RESEARCH_DATA_VERSION,
  MarketResearchDataError,
  createEmptyMarketResearchData,
  mergeMarketResearchData,
  parseMarketResearchImport,
  serializeMarketResearchData,
  type InvestmentMemo,
} from './market-research-data';

const memo: InvestmentMemo = {
  interestReason: 'Stable cash generation',
  positiveThesis: 'Margins may expand',
  negativeThesis: 'Demand may weaken',
  numbersToVerify: 'Quarterly operating margin',
  reviewCondition: 'Review after earnings',
  invalidationCondition: 'Two quarters of falling free cash flow',
  nextReviewDate: '2026-08-15',
};

function expectDataError(action: () => unknown, code: MarketResearchDataError['code']): void {
  try {
    action();
    throw new Error('Expected MarketResearchDataError');
  } catch (error) {
    expect(error).toBeInstanceOf(MarketResearchDataError);
    expect((error as MarketResearchDataError).code).toBe(code);
  }
}

describe('market research data contract', () => {
  it('round-trips current data through the import and export helpers', () => {
    const data = {
      dataVersion: MARKET_RESEARCH_DATA_VERSION,
      investmentMemos: { NVDA: memo },
      savedNewsIds: ['news-us-001'],
    };

    expect(parseMarketResearchImport(serializeMarketResearchData(data))).toEqual(data);
  });

  it('migrates the legacy v0 memo array into the current symbol map', () => {
    const migrated = parseMarketResearchImport(
      JSON.stringify({
        dataVersion: 0,
        memos: [{ symbol: '005930', ...memo }],
        savedNewsIds: ['news-kr-001'],
      }),
    );

    expect(migrated).toEqual({
      dataVersion: 1,
      investmentMemos: { '005930': memo },
      savedNewsIds: ['news-kr-001'],
    });
  });

  it('rejects malformed JSON before it can be imported', () => {
    expectDataError(() => parseMarketResearchImport('{"dataVersion":'), 'INVALID_JSON');
  });

  it('rejects data created by an unsupported future version', () => {
    expectDataError(
      () =>
        parseMarketResearchImport(
          JSON.stringify({ dataVersion: 2, investmentMemos: {}, savedNewsIds: [] }),
        ),
      'UNSUPPORTED_VERSION',
    );
  });

  it('rejects impossible or non-canonical review dates', () => {
    for (const nextReviewDate of ['2026-02-30', '2026-2-03', 'not-a-date']) {
      expectDataError(
        () =>
          parseMarketResearchImport(
            JSON.stringify({
              dataVersion: 1,
              investmentMemos: { NVDA: { ...memo, nextReviewDate } },
              savedNewsIds: [],
            }),
          ),
        'INVALID_DATA',
      );
    }
  });

  it('rejects unknown fields and duplicate saved-news identifiers', () => {
    expectDataError(
      () =>
        parseMarketResearchImport(
          JSON.stringify({
            dataVersion: 1,
            investmentMemos: {},
            savedNewsIds: ['news-1', 'news-1'],
            unexpected: true,
          }),
        ),
      'INVALID_DATA',
    );
  });

  it('merges only after validation, preserving current memo conflicts and unioning news IDs', () => {
    const current = {
      dataVersion: 1 as const,
      investmentMemos: {
        NVDA: memo,
        TSLA: { ...memo, interestReason: 'Existing Tesla note' },
      },
      savedNewsIds: ['news-1', 'news-2'],
    };
    const imported = {
      dataVersion: 1 as const,
      investmentMemos: {
        NVDA: { ...memo, interestReason: 'Imported NVIDIA note' },
      },
      savedNewsIds: ['news-2', 'news-3'],
    };

    expect(mergeMarketResearchData(current, imported)).toEqual({
      dataVersion: 1,
      investmentMemos: {
        NVDA: memo,
        TSLA: { ...memo, interestReason: 'Existing Tesla note' },
      },
      savedNewsIds: ['news-1', 'news-2', 'news-3'],
    });
    expect(createEmptyMarketResearchData()).toEqual({
      dataVersion: 1,
      investmentMemos: {},
      savedNewsIds: [],
    });
  });
});
