export const THEME_DEFINITIONS = [
  { id: 'semiconductor', name: '반도체' },
  { id: 'ai-infrastructure', name: 'AI 인프라' },
  { id: 'electric-vehicle', name: '전기차' },
  { id: 'nuclear-power', name: '원전' },
  { id: 'defense', name: '방산' },
  { id: 'robotics', name: '로봇' },
  { id: 'biotech', name: '바이오' },
  { id: 'shipbuilding', name: '조선' },
  { id: 'aerospace', name: '우주항공' },
  { id: 'data-center-power', name: '데이터센터 전력' },
] as const;

export const THEME_RELATION_LEVELS = [
  'core',
  'supply-chain',
  'indirect-beneficiary',
] as const;

export type ThemeId = (typeof THEME_DEFINITIONS)[number]['id'];
export type ThemeName = (typeof THEME_DEFINITIONS)[number]['name'];
export type ThemeRelationLevel = (typeof THEME_RELATION_LEVELS)[number];
export type ThemeMomentum = 'positive' | 'neutral' | 'negative';
export type ThemeSource = 'mock';

export interface ThemeRelatedStock {
  symbol: string;
  name: string;
  relation: ThemeRelationLevel;
}

export interface InvestmentTheme {
  id: ThemeId;
  name: ThemeName;
  description: string;
  domesticStocks: readonly ThemeRelatedStock[];
  usStocks: readonly ThemeRelatedStock[];
  catalysts: readonly string[];
  risks: readonly string[];
  recentInterest: number;
  shortTermMomentum: ThemeMomentum;
  relatedNewsCount: number;
  source: ThemeSource;
  updatedAt: string;
}
