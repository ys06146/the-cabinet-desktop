/// <reference types="node" />

import { describe, expect, it } from 'vitest';
import {
  MARKET_RESEARCH_LIMITS,
  parseMarketResearchImport,
  serializeMarketResearchData,
  type InvestmentMemo,
} from './market-research-data';

describe('market research UTF-8 transfer limits', () => {
  it('allows a valid maximum-size Korean export to pass both character and byte limits', () => {
    const text = '가'.repeat(MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters);
    const memo: InvestmentMemo = {
      interestReason: text,
      positiveThesis: text,
      negativeThesis: text,
      numbersToVerify: text,
      reviewCondition: text,
      invalidationCondition: text,
      nextReviewDate: '2026-08-30',
    };
    const investmentMemos = Object.fromEntries(
      Array.from({ length: MARKET_RESEARCH_LIMITS.maxInvestmentMemos }, (_, index) => [
        `S${index}`,
        memo,
      ]),
    );
    const serialized = serializeMarketResearchData({
      dataVersion: 1,
      investmentMemos,
      savedNewsIds: [],
    });
    const bytes = Buffer.byteLength(serialized, 'utf8');

    expect(serialized.length).toBeLessThanOrEqual(
      MARKET_RESEARCH_LIMITS.maxSerializedCharacters,
    );
    expect(bytes).toBeGreaterThan(serialized.length);
    expect(bytes).toBeLessThanOrEqual(MARKET_RESEARCH_LIMITS.maxSerializedBytes);
    expect(Object.keys(parseMarketResearchImport(serialized).investmentMemos)).toHaveLength(100);
  });
});
