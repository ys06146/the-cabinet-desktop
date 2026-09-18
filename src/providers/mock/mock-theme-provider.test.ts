import { describe, expect, it } from 'vitest';
import {
  THEME_DEFINITIONS,
  THEME_RELATION_LEVELS,
  type ThemeId,
} from '../../domain/theme';
import { MOCK_NEWS_FIXTURES } from './news-fixtures';
import {
  MockThemeProvider,
  MockThemeProviderError,
} from './mock-theme-provider';

const fixedNow = () => new Date('2026-07-30T08:30:00.000Z');

describe('MockThemeProvider', () => {
  it('returns the ten required themes in their canonical order', async () => {
    const provider = new MockThemeProvider({ latencyMs: 0, now: fixedNow });
    const themes = await provider.getThemes();

    expect(themes.map(({ id, name }) => ({ id, name }))).toEqual(THEME_DEFINITIONS);
    expect(themes).toHaveLength(10);
    expect(themes.every((theme) => theme.source === 'mock')).toBe(true);
    expect(themes.every((theme) => theme.updatedAt === fixedNow().toISOString())).toBe(true);
  });

  it('uses only the three allowed relation levels and complete theme fields', async () => {
    const provider = new MockThemeProvider({ latencyMs: 0, now: fixedNow });
    const themes = await provider.getThemes();
    const relations = themes.flatMap((theme) =>
      [...theme.domesticStocks, ...theme.usStocks].map((stock) => stock.relation),
    );

    expect(new Set(relations)).toEqual(new Set(THEME_RELATION_LEVELS));
    expect(
      themes.every(
        (theme) =>
          theme.description.length > 0 &&
          theme.domesticStocks.length > 0 &&
          theme.usStocks.length > 0 &&
          theme.catalysts.length > 0 &&
          theme.risks.length > 0 &&
          theme.recentInterest >= 0 &&
          theme.recentInterest <= 100,
      ),
    ).toBe(true);
  });

  it('derives each related-news count from the news fixtures', async () => {
    const provider = new MockThemeProvider({ latencyMs: 0, now: fixedNow });
    const themes = await provider.getThemes();

    for (const theme of themes) {
      const expected = MOCK_NEWS_FIXTURES.filter(({ item }) =>
        item.relatedThemes.includes(theme.name),
      ).length;
      expect(theme.relatedNewsCount).toBe(expected);
    }
  });

  it('returns defensive copies, rejects unknown ids, and supports failures', async () => {
    const provider = new MockThemeProvider({ latencyMs: 0, now: fixedNow });
    const first = await provider.getTheme('semiconductor');
    first.domesticStocks[0].name = 'changed';
    const second = await provider.getTheme('semiconductor');
    expect(second.domesticStocks[0].name).toBe('삼성전자');
    await expect(provider.getTheme('unknown' as ThemeId)).rejects.toThrow(
      'Unknown mock theme id',
    );

    const failed = new MockThemeProvider({
      latencyMs: 0,
      failureRate: 1,
      random: () => 0,
    });
    await expect(failed.getThemes()).rejects.toBeInstanceOf(MockThemeProviderError);
  });
});
