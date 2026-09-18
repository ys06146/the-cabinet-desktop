import type { InvestmentTheme, ThemeId, ThemeRelatedStock } from '../../domain/theme';
import type { ThemeProvider } from '../theme/theme-provider';
import { MOCK_NEWS_FIXTURES } from './news-fixtures';
import {
  MockProviderSimulator,
  type MockProviderSimulationOptions,
} from './mock-provider-simulator';
import { MOCK_THEME_FIXTURES } from './theme-fixtures';

export type ThemeOperation = 'list' | 'detail';

export interface MockThemeProviderOptions
  extends MockProviderSimulationOptions<ThemeOperation> {
  now?: () => Date;
}

export class MockThemeProviderError extends Error {
  constructor(operation: ThemeOperation) {
    super(`Mock theme request failed during ${operation}.`);
    this.name = 'MockThemeProviderError';
  }
}

function cloneStocks(
  stocks: readonly ThemeRelatedStock[],
): ThemeRelatedStock[] {
  return stocks.map((stock) => ({ ...stock }));
}

export class MockThemeProvider implements ThemeProvider {
  private readonly simulator: MockProviderSimulator<ThemeOperation>;
  private readonly now: () => Date;

  constructor(options: MockThemeProviderOptions = {}) {
    this.simulator = new MockProviderSimulator(
      options,
      (operation) => new MockThemeProviderError(operation),
    );
    this.now = options.now ?? (() => new Date());
  }

  getThemes(): Promise<InvestmentTheme[]> {
    return this.simulator.execute('list', () => {
      const updatedAt = this.now().toISOString();
      return MOCK_THEME_FIXTURES.map((fixture) => this.createTheme(fixture.id, updatedAt));
    });
  }

  getTheme(themeId: ThemeId): Promise<InvestmentTheme> {
    return this.simulator.execute('detail', () => this.createTheme(themeId, this.now().toISOString()));
  }

  private createTheme(themeId: ThemeId, updatedAt: string): InvestmentTheme {
    const fixture = MOCK_THEME_FIXTURES.find((candidate) => candidate.id === themeId);
    if (!fixture) {
      throw new Error(`Unknown mock theme id: ${themeId}`);
    }

    return {
      ...fixture,
      domesticStocks: cloneStocks(fixture.domesticStocks),
      usStocks: cloneStocks(fixture.usStocks),
      catalysts: [...fixture.catalysts],
      risks: [...fixture.risks],
      relatedNewsCount: MOCK_NEWS_FIXTURES.filter(({ item }) =>
        item.relatedThemes.includes(fixture.name),
      ).length,
      source: 'mock',
      updatedAt,
    };
  }
}

export const mockThemeProvider = new MockThemeProvider();
