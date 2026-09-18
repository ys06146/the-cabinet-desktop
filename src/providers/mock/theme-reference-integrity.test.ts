import { describe, expect, it } from 'vitest';
import { THEME_DEFINITIONS } from '../../domain/theme';
import { MOCK_NEWS_FIXTURES } from './news-fixtures';

describe('mock news theme references', () => {
  it('links every news theme to a canonical theme definition', () => {
    const canonicalNames = new Set(THEME_DEFINITIONS.map((theme) => theme.name));

    for (const fixture of MOCK_NEWS_FIXTURES) {
      expect(fixture.item.relatedThemes.length).toBeGreaterThan(0);
      for (const themeName of fixture.item.relatedThemes) {
        expect(canonicalNames.has(themeName)).toBe(true);
      }
    }
  });
});
