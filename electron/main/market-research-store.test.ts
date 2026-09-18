import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketResearchDataError, type InvestmentMemo } from '../../src/domain/market-research-data';
import { MARKET_RESEARCH_FILE_NAME, MarketResearchStore } from './market-research-store';

const memo: InvestmentMemo = {
  interestReason: 'Durable demand',
  positiveThesis: 'Capacity utilization improves',
  negativeThesis: 'Pricing pressure returns',
  numbersToVerify: 'Utilization and gross margin',
  reviewCondition: 'Next quarterly filing',
  invalidationCondition: 'Utilization falls while inventory rises',
  nextReviewDate: '2026-09-01',
};

const temporaryDirectories: string[] = [];

function createUserDataDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'the-cabinet-market-research-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('MarketResearchStore', () => {
  it('persists data across a new store instance, simulating save, quit, and relaunch', () => {
    const userDataPath = createUserDataDirectory();
    const firstSession = new MarketResearchStore({ userDataPath });
    firstSession.saveInvestmentMemo('nvda', memo);
    firstSession.setNewsSaved('news-us-001', true);

    const relaunchedSession = new MarketResearchStore({ userDataPath });
    expect(relaunchedSession.load()).toEqual({
      dataVersion: 1,
      investmentMemos: { NVDA: memo },
      savedNewsIds: ['news-us-001'],
    });
    expect(JSON.parse(readFileSync(join(userDataPath, MARKET_RESEARCH_FILE_NAME), 'utf8'))).toEqual(
      relaunchedSession.load(),
    );
    expect(readdirSync(userDataPath)).toEqual([MARKET_RESEARCH_FILE_NAME]);
  });

  it('imports valid data without replacing existing notes or dropping saved news', () => {
    const store = new MarketResearchStore({ userDataPath: createUserDataDirectory() });
    store.saveInvestmentMemo('TSLA', { ...memo, interestReason: 'Existing Tesla note' });
    store.setNewsSaved('news-existing', true);

    const imported = store.importFromJson(
      JSON.stringify({
        dataVersion: 1,
        investmentMemos: { NVDA: memo },
        savedNewsIds: ['news-existing', 'news-imported'],
      }),
    );

    expect(Object.keys(imported.investmentMemos).sort()).toEqual(['NVDA', 'TSLA']);
    expect(imported.savedNewsIds).toEqual(['news-existing', 'news-imported']);
  });

  it('leaves the persisted data untouched when an import is invalid', () => {
    const store = new MarketResearchStore({ userDataPath: createUserDataDirectory() });
    store.saveInvestmentMemo('NVDA', memo);
    const before = store.exportToJson();

    expect(() => store.importFromJson('{invalid')).toThrow(MarketResearchDataError);
    expect(store.exportToJson()).toBe(before);
  });

  it('migrates v0 imports before merging and writing the current version', () => {
    const store = new MarketResearchStore({ userDataPath: createUserDataDirectory() });
    const imported = store.importFromJson(
      JSON.stringify({
        dataVersion: 0,
        memos: [{ symbol: '005930', ...memo }],
        savedNewsIds: ['news-legacy'],
      }),
    );

    expect(imported.dataVersion).toBe(1);
    expect(imported.investmentMemos['005930']).toEqual(memo);
    expect(store.load()).toEqual(imported);
  });
});
