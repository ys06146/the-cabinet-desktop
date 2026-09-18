import type {
  InvestmentMemo,
  MarketResearchDataV1,
} from '../../domain/market-research-data';

export type ResearchDataExportResult =
  | { status: 'cancelled' }
  | {
      status: 'exported';
      investmentMemoCount: number;
      savedNewsCount: number;
    };

export type ResearchDataImportResult =
  | { status: 'cancelled' }
  | {
      status: 'imported';
      data: MarketResearchDataV1;
      investmentMemoCount: number;
      savedNewsCount: number;
    };

export interface MarketResearchDataProvider {
  load(): Promise<MarketResearchDataV1>;
  saveInvestmentMemo(symbol: string, memo: InvestmentMemo): Promise<MarketResearchDataV1>;
  setNewsSaved(newsId: string, isSaved: boolean): Promise<MarketResearchDataV1>;
  exportJson(): Promise<ResearchDataExportResult>;
  importJson(): Promise<ResearchDataImportResult>;
}
