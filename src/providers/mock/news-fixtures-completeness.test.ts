import { describe, expect, it } from 'vitest';
import { MOCK_NEWS_FIXTURES } from './news-fixtures';

describe('mock news fixture completeness', () => {
  it('keeps every fictional story and impact brief complete', () => {
    for (const { item, detail } of MOCK_NEWS_FIXTURES) {
      expect(item.title.startsWith('가상')).toBe(true);
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
      expect(item.relatedSymbols.length).toBeGreaterThan(0);
      expect(item.relatedThemes.length).toBeGreaterThan(0);
      expect(item.summaryLines).toHaveLength(2);
      expect(item.summaryLines.every((line) => line.trim().length > 0)).toBe(true);
      expect(detail.summary.trim().length).toBeGreaterThan(0);
      expect(detail.directImpact.length).toBeGreaterThan(0);
      expect(detail.indirectImpact.length).toBeGreaterThan(0);
      expect(detail.counterPerspective.trim().length).toBeGreaterThan(0);
      expect(detail.unconfirmedPoints.length).toBeGreaterThan(0);
    }
  });
});
