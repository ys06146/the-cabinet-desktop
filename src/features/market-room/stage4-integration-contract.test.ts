/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const marketRoomSource = readFileSync(new URL('./MarketRoom.tsx', import.meta.url), 'utf8');
const memoSource = readFileSync(
  new URL('./components/InvestmentMemoEditor.tsx', import.meta.url),
  'utf8',
);
const preloadSource = readFileSync(
  new URL('../../../electron/preload/index.ts', import.meta.url),
  'utf8',
);
const ipcContractSource = readFileSync(
  new URL('../../../electron/shared/ipc.ts', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(
  new URL('../../../electron/main/index.ts', import.meta.url),
  'utf8',
);

describe('Stage 4 integration contracts', () => {
  it('connects all three Stage 4 surfaces without removing Stage 3 research', () => {
    for (const component of [
      'MarketResearchDesk',
      'NewsDesk',
      'ThemeExplorer',
      'MarketMemoPanel',
    ]) {
      expect(marketRoomSource).toContain(`<${component}`);
    }
    expect(marketRoomSource).toContain('useMarketResearchData');
    expect(marketRoomSource).toContain('useMarketContent');
  });

  it('keeps filesystem access behind named preload methods', () => {
    for (const channel of [
      'market-research:get-data',
      'market-research:save-memo',
      'market-research:set-news-saved',
      'market-research:export-json',
      'market-research:import-json',
    ]) {
      expect(ipcContractSource).toContain(channel);
    }
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld('theCabinet', bridge)");
    expect(preloadSource).not.toMatch(/node:fs|from ['"]fs['"]/);
    expect(mainSource).toContain("app.getPath('userData')");
  });

  it('prevents transfer of unsaved drafts and mirrors domain text limits', () => {
    expect(memoSource).toContain('hasUnsavedDrafts');
    expect(memoSource).toContain('MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters');
    expect(memoSource).toContain("statusMessageTone === 'error'");
  });
});
