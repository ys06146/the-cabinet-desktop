import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  createEmptyMarketResearchData,
  mergeMarketResearchData,
  parseMarketResearchImport,
  removeInvestmentMemo,
  serializeMarketResearchData,
  setSavedNews,
  upsertInvestmentMemo,
  validateMarketResearchData,
  type InvestmentMemo,
  type MarketResearchDataV1,
} from '../../src/domain/market-research-data';

export const MARKET_RESEARCH_FILE_NAME = 'market-research-data.json';

export interface MarketResearchStoreOptions {
  userDataPath: string;
}

function resolveStoragePath(userDataPath: string): string {
  if (typeof userDataPath !== 'string' || userDataPath.trim().length === 0) {
    throw new TypeError('A non-empty Electron userData path is required');
  }

  if (!isAbsolute(userDataPath)) {
    throw new TypeError('The Electron userData path must be absolute');
  }
  const resolvedUserDataPath = resolve(userDataPath);
  return join(resolvedUserDataPath, MARKET_RESEARCH_FILE_NAME);
}

function writeAtomically(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;

  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(descriptor, contents, { encoding: 'utf8' });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, filePath);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // The original write error is more useful to the caller.
      }
    }
    try {
      unlinkSync(temporaryPath);
    } catch {
      // The temporary file may not exist or may already have been renamed.
    }
    throw error;
  }
}

export class MarketResearchStore {
  readonly storagePath: string;

  constructor(options: MarketResearchStoreOptions) {
    this.storagePath = resolveStoragePath(options.userDataPath);
  }

  load(): MarketResearchDataV1 {
    if (!existsSync(this.storagePath)) {
      return createEmptyMarketResearchData();
    }
    return parseMarketResearchImport(readFileSync(this.storagePath, 'utf8'));
  }

  save(data: unknown): MarketResearchDataV1 {
    const validated = validateMarketResearchData(data);
    writeAtomically(this.storagePath, serializeMarketResearchData(validated));
    return validated;
  }

  saveInvestmentMemo(symbol: string, memo: InvestmentMemo): MarketResearchDataV1 {
    return this.save(upsertInvestmentMemo(this.load(), symbol, memo));
  }

  removeInvestmentMemo(symbol: string): MarketResearchDataV1 {
    return this.save(removeInvestmentMemo(this.load(), symbol));
  }

  setNewsSaved(newsId: string, isSaved: boolean): MarketResearchDataV1 {
    return this.save(setSavedNews(this.load(), newsId, isSaved));
  }

  exportToJson(): string {
    return serializeMarketResearchData(this.load());
  }

  importFromJson(serialized: string): MarketResearchDataV1 {
    const imported = parseMarketResearchImport(serialized);
    const merged = mergeMarketResearchData(this.load(), imported);
    return this.save(merged);
  }
}
