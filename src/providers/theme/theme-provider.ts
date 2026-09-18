import type { InvestmentTheme, ThemeId } from '../../domain/theme';

export interface ThemeProvider {
  getThemes(): Promise<InvestmentTheme[]>;
  getTheme(themeId: ThemeId): Promise<InvestmentTheme>;
}
