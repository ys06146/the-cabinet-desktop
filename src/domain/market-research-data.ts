export const MARKET_RESEARCH_DATA_VERSION = 1 as const;

export const MARKET_RESEARCH_LIMITS = Object.freeze({
  maxSerializedCharacters: 4_000_000,
  maxSerializedBytes: 16_000_000,
  maxInvestmentMemos: 100,
  maxSavedNewsIds: 1_000,
  maxMemoFieldCharacters: 4_000,
  maxNewsIdCharacters: 128,
  maxSymbolCharacters: 20,
});

export interface InvestmentMemo {
  interestReason: string;
  positiveThesis: string;
  negativeThesis: string;
  numbersToVerify: string;
  reviewCondition: string;
  invalidationCondition: string;
  nextReviewDate: string | null;
}

export interface MarketResearchDataV1 {
  dataVersion: 1;
  investmentMemos: Record<string, InvestmentMemo>;
  savedNewsIds: string[];
}

export type MarketResearchData = MarketResearchDataV1;

export type MarketResearchDataErrorCode =
  | 'DATA_TOO_LARGE'
  | 'INVALID_DATA'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_VERSION';

export class MarketResearchDataError extends Error {
  constructor(
    public readonly code: MarketResearchDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarketResearchDataError';
  }
}

interface LegacyInvestmentMemoV0 extends InvestmentMemo {
  symbol: string;
}

interface LegacyMarketResearchDataV0 {
  dataVersion: 0;
  memos: LegacyInvestmentMemoV0[];
  savedNewsIds: string[];
}

type MarketResearchMigrator = (value: unknown) => unknown;

const MEMO_FIELDS = [
  'interestReason',
  'positiveThesis',
  'negativeThesis',
  'numbersToVerify',
  'reviewCondition',
  'invalidationCondition',
  'nextReviewDate',
] as const;

function invalid(path: string, reason: string): never {
  throw new MarketResearchDataError('INVALID_DATA', `${path}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    invalid(path, 'must be an object');
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
): void {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      invalid(`${path}.${key}`, 'is not a supported field');
    }
  }

  for (const key of allowedKeys) {
    if (!Object.hasOwn(value, key)) {
      invalid(`${path}.${key}`, 'is required');
    }
  }
}

function assertMemoText(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalid(path, 'must be a string');
  }
  if (value.length > MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters) {
    invalid(path, `must be at most ${MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters} characters`);
  }
  return value;
}

function isIsoDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1_000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function assertNextReviewDate(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string' || !isIsoDateOnly(value)) {
    invalid(path, 'must be null or a real calendar date in YYYY-MM-DD format');
  }
  return value;
}

function assertSymbol(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.length > MARKET_RESEARCH_LIMITS.maxSymbolCharacters ||
    !/^[A-Z0-9][A-Z0-9.-]*$/.test(value)
  ) {
    invalid(path, 'must be an uppercase market symbol containing only letters, digits, dots, or hyphens');
  }
  return value;
}

function assertNewsId(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.length > MARKET_RESEARCH_LIMITS.maxNewsIdCharacters ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    invalid(path, 'must be a non-empty safe identifier');
  }
  return value;
}

export function normalizeMarketSymbol(symbol: string): string {
  return assertSymbol(symbol.trim().toUpperCase(), 'symbol');
}

export function validateInvestmentMemo(value: unknown, path = 'memo'): InvestmentMemo {
  const candidate = assertRecord(value, path);
  assertExactKeys(candidate, MEMO_FIELDS, path);

  return {
    interestReason: assertMemoText(candidate.interestReason, `${path}.interestReason`),
    positiveThesis: assertMemoText(candidate.positiveThesis, `${path}.positiveThesis`),
    negativeThesis: assertMemoText(candidate.negativeThesis, `${path}.negativeThesis`),
    numbersToVerify: assertMemoText(candidate.numbersToVerify, `${path}.numbersToVerify`),
    reviewCondition: assertMemoText(candidate.reviewCondition, `${path}.reviewCondition`),
    invalidationCondition: assertMemoText(
      candidate.invalidationCondition,
      `${path}.invalidationCondition`,
    ),
    nextReviewDate: assertNextReviewDate(candidate.nextReviewDate, `${path}.nextReviewDate`),
  };
}

function validateSavedNewsIds(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array');
  }
  if (value.length > MARKET_RESEARCH_LIMITS.maxSavedNewsIds) {
    invalid(path, `must contain at most ${MARKET_RESEARCH_LIMITS.maxSavedNewsIds} items`);
  }

  const result = value.map((item, index) => assertNewsId(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) {
    invalid(path, 'must not contain duplicate identifiers');
  }
  return result;
}

export function createEmptyMarketResearchData(): MarketResearchDataV1 {
  return {
    dataVersion: MARKET_RESEARCH_DATA_VERSION,
    investmentMemos: {},
    savedNewsIds: [],
  };
}

export function validateMarketResearchData(value: unknown): MarketResearchDataV1 {
  const candidate = assertRecord(value, 'data');
  assertExactKeys(candidate, ['dataVersion', 'investmentMemos', 'savedNewsIds'], 'data');

  if (candidate.dataVersion !== MARKET_RESEARCH_DATA_VERSION) {
    throw new MarketResearchDataError(
      'UNSUPPORTED_VERSION',
      `Unsupported market research data version: ${String(candidate.dataVersion)}`,
    );
  }

  const memoCandidates = assertRecord(candidate.investmentMemos, 'data.investmentMemos');
  const memoEntries = Object.entries(memoCandidates);
  if (memoEntries.length > MARKET_RESEARCH_LIMITS.maxInvestmentMemos) {
    invalid(
      'data.investmentMemos',
      `must contain at most ${MARKET_RESEARCH_LIMITS.maxInvestmentMemos} entries`,
    );
  }

  const investmentMemos: Record<string, InvestmentMemo> = {};
  for (const [symbol, memo] of memoEntries) {
    assertSymbol(symbol, `data.investmentMemos.${symbol}`);
    investmentMemos[symbol] = validateInvestmentMemo(memo, `data.investmentMemos.${symbol}`);
  }

  return {
    dataVersion: MARKET_RESEARCH_DATA_VERSION,
    investmentMemos,
    savedNewsIds: validateSavedNewsIds(candidate.savedNewsIds, 'data.savedNewsIds'),
  };
}

function validateLegacyV0(value: unknown): LegacyMarketResearchDataV0 {
  const candidate = assertRecord(value, 'data');
  assertExactKeys(candidate, ['dataVersion', 'memos', 'savedNewsIds'], 'data');
  if (candidate.dataVersion !== 0) {
    invalid('data.dataVersion', 'must be 0');
  }
  if (!Array.isArray(candidate.memos)) {
    invalid('data.memos', 'must be an array');
  }
  if (candidate.memos.length > MARKET_RESEARCH_LIMITS.maxInvestmentMemos) {
    invalid('data.memos', `must contain at most ${MARKET_RESEARCH_LIMITS.maxInvestmentMemos} items`);
  }

  const symbols = new Set<string>();
  const memos = candidate.memos.map((value, index): LegacyInvestmentMemoV0 => {
    const path = `data.memos[${index}]`;
    const memoCandidate = assertRecord(value, path);
    assertExactKeys(memoCandidate, ['symbol', ...MEMO_FIELDS], path);
    const symbol = assertSymbol(memoCandidate.symbol, `${path}.symbol`);
    if (symbols.has(symbol)) {
      invalid(`${path}.symbol`, 'must not duplicate another memo symbol');
    }
    symbols.add(symbol);

    return {
      symbol,
      ...validateInvestmentMemo(
        Object.fromEntries(MEMO_FIELDS.map((field) => [field, memoCandidate[field]])),
        path,
      ),
    };
  });

  return {
    dataVersion: 0,
    memos,
    savedNewsIds: validateSavedNewsIds(candidate.savedNewsIds, 'data.savedNewsIds'),
  };
}

function migrateV0ToV1(value: unknown): MarketResearchDataV1 {
  const legacy = validateLegacyV0(value);
  return {
    dataVersion: 1,
    investmentMemos: Object.fromEntries(
      legacy.memos.map(({ symbol, ...memo }) => [symbol, memo]),
    ),
    savedNewsIds: legacy.savedNewsIds,
  };
}

export const MARKET_RESEARCH_MIGRATIONS: Readonly<Record<number, MarketResearchMigrator>> =
  Object.freeze({
    0: migrateV0ToV1,
  });

function readDataVersion(value: unknown): number {
  const candidate = assertRecord(value, 'data');
  const version = candidate.dataVersion;
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 0) {
    invalid('data.dataVersion', 'must be a non-negative integer');
  }
  return version;
}

export function migrateMarketResearchData(value: unknown): MarketResearchDataV1 {
  let migrated = value;
  let version = readDataVersion(migrated);

  if (version > MARKET_RESEARCH_DATA_VERSION) {
    throw new MarketResearchDataError(
      'UNSUPPORTED_VERSION',
      `Data version ${version} is newer than supported version ${MARKET_RESEARCH_DATA_VERSION}`,
    );
  }

  while (version < MARKET_RESEARCH_DATA_VERSION) {
    const migrator = MARKET_RESEARCH_MIGRATIONS[version];
    if (!migrator) {
      throw new MarketResearchDataError(
        'UNSUPPORTED_VERSION',
        `No migration is available from data version ${version}`,
      );
    }
    migrated = migrator(migrated);
    const nextVersion = readDataVersion(migrated);
    if (nextVersion !== version + 1) {
      invalid('data.dataVersion', 'migration must advance exactly one data version');
    }
    version = nextVersion;
  }

  return validateMarketResearchData(migrated);
}

export function parseMarketResearchImport(serialized: string): MarketResearchDataV1 {
  if (typeof serialized !== 'string') {
    invalid('import', 'must be JSON text');
  }
  if (serialized.length > MARKET_RESEARCH_LIMITS.maxSerializedCharacters) {
    throw new MarketResearchDataError(
      'DATA_TOO_LARGE',
      `Import exceeds ${MARKET_RESEARCH_LIMITS.maxSerializedCharacters} characters`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new MarketResearchDataError('INVALID_JSON', 'The selected file is not valid JSON');
  }
  return migrateMarketResearchData(parsed);
}

export function serializeMarketResearchData(value: unknown): string {
  const serialized = `${JSON.stringify(validateMarketResearchData(value), null, 2)}\n`;
  if (serialized.length > MARKET_RESEARCH_LIMITS.maxSerializedCharacters) {
    throw new MarketResearchDataError(
      'DATA_TOO_LARGE',
      `Export exceeds ${MARKET_RESEARCH_LIMITS.maxSerializedCharacters} characters`,
    );
  }
  return serialized;
}

export function mergeMarketResearchData(
  current: unknown,
  imported: unknown,
): MarketResearchDataV1 {
  const currentData = validateMarketResearchData(current);
  const importedData = validateMarketResearchData(imported);

  return validateMarketResearchData({
    dataVersion: MARKET_RESEARCH_DATA_VERSION,
    investmentMemos: {
      ...importedData.investmentMemos,
      ...currentData.investmentMemos,
    },
    savedNewsIds: [...new Set([...currentData.savedNewsIds, ...importedData.savedNewsIds])],
  });
}

export function upsertInvestmentMemo(
  data: unknown,
  symbol: string,
  memo: unknown,
): MarketResearchDataV1 {
  const current = validateMarketResearchData(data);
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  return validateMarketResearchData({
    ...current,
    investmentMemos: {
      ...current.investmentMemos,
      [normalizedSymbol]: validateInvestmentMemo(memo),
    },
  });
}

export function removeInvestmentMemo(data: unknown, symbol: string): MarketResearchDataV1 {
  const current = validateMarketResearchData(data);
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const investmentMemos = Object.fromEntries(
    Object.entries(current.investmentMemos).filter(([key]) => key !== normalizedSymbol),
  );
  return { ...current, investmentMemos };
}

export function setSavedNews(
  data: unknown,
  newsId: string,
  isSaved: boolean,
): MarketResearchDataV1 {
  const current = validateMarketResearchData(data);
  const normalizedNewsId = assertNewsId(newsId, 'newsId');
  const savedNewsIds = isSaved
    ? [...new Set([...current.savedNewsIds, normalizedNewsId])]
    : current.savedNewsIds.filter((id) => id !== normalizedNewsId);
  return validateMarketResearchData({ ...current, savedNewsIds });
}
