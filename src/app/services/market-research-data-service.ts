import {
  normalizeMarketSymbol,
  validateInvestmentMemo,
  type InvestmentMemo,
  type MarketResearchDataV1,
} from '../../domain/market-research-data';
import { electronMarketResearchDataProvider } from '../../providers/research/electron-market-research-data-provider';
import type {
  MarketResearchDataProvider,
  ResearchDataExportResult,
  ResearchDataImportResult,
} from '../../providers/research/market-research-data-provider';

export class MarketResearchDataService {
  constructor(private readonly provider: MarketResearchDataProvider) {}

  load(): Promise<MarketResearchDataV1> {
    return this.provider.load();
  }

  saveInvestmentMemo(
    symbol: string,
    memo: InvestmentMemo,
  ): Promise<MarketResearchDataV1> {
    return this.provider.saveInvestmentMemo(
      normalizeMarketSymbol(symbol),
      validateInvestmentMemo(memo),
    );
  }

  setNewsSaved(newsId: string, isSaved: boolean): Promise<MarketResearchDataV1> {
    return this.provider.setNewsSaved(newsId, isSaved);
  }

  exportJson(): Promise<ResearchDataExportResult> {
    return this.provider.exportJson();
  }

  importJson(): Promise<ResearchDataImportResult> {
    return this.provider.importJson();
  }
}

export const marketResearchDataService = new MarketResearchDataService(
  electronMarketResearchDataProvider,
);
