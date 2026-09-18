import type { MarketResearchDataProvider } from './market-research-data-provider';

export const electronMarketResearchDataProvider: MarketResearchDataProvider = {
  load: () => window.theCabinet.getMarketResearchData(),
  saveInvestmentMemo: (symbol, memo) =>
    window.theCabinet.saveInvestmentMemo({ symbol, memo }),
  setNewsSaved: (newsId, isSaved) =>
    window.theCabinet.setNewsSaved({ newsId, isSaved }),
  exportJson: () => window.theCabinet.exportMarketResearchData(),
  importJson: () => window.theCabinet.importMarketResearchData(),
};
