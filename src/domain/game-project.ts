import {
  GAME_IDEATION_QUESTIONS,
  getGameIdeationAnswer,
  validateGameIdeationSession,
} from './game-ideation';

export const GAME_PROJECT_COMPLETION_STATUSES = [
  'concept',
  'design-draft',
  'prototype-ready',
] as const;

export const GAME_PROJECT_LIMITS = Object.freeze({
  maxIdCharacters: 128,
  maxTextCharacters: 4_000,
  maxListItems: 50,
  maxEstimatedPlayTimeMinutes: 1_440,
});

export type GameProjectSource = 'mock';
export type GameProjectCompletionStatus =
  (typeof GAME_PROJECT_COMPLETION_STATUSES)[number];

export interface GameProjectOverview {
  title: string;
  oneLineDescription: string;
  genre: string;
  coreAction: string;
  winCondition: string;
  failureCondition: string;
  estimatedPlayTimeMinutes: number;
  completionStatus: GameProjectCompletionStatus;
  nextTask: string;
}

export interface GameDesign {
  objective: string;
  gameplayLoop: readonly string[];
  coreRules: readonly string[];
  controls: readonly string[];
  difficultyProgression: string;
  scoringSystem: string;
  endConditions: readonly string[];
  minimumViableFeatures: readonly string[];
  futureFeatures: readonly string[];
}

export interface GameProject {
  id: string;
  initialIdea: string;
  overview: GameProjectOverview;
  design: GameDesign;
  source: GameProjectSource;
  createdAt: string;
  updatedAt: string;
}

export interface RuleBasedGameProjectOptions {
  id: string;
  now: Date | string;
}

export class GameProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameProjectValidationError';
  }
}

const PROJECT_KEYS = [
  'id',
  'initialIdea',
  'overview',
  'design',
  'source',
  'createdAt',
  'updatedAt',
] as const;

const OVERVIEW_KEYS = [
  'title',
  'oneLineDescription',
  'genre',
  'coreAction',
  'winCondition',
  'failureCondition',
  'estimatedPlayTimeMinutes',
  'completionStatus',
  'nextTask',
] as const;

const DESIGN_KEYS = [
  'objective',
  'gameplayLoop',
  'coreRules',
  'controls',
  'difficultyProgression',
  'scoringSystem',
  'endConditions',
  'minimumViableFeatures',
  'futureFeatures',
] as const;

function invalid(path: string, reason: string): never {
  throw new GameProjectValidationError(`${path}: ${reason}`);
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
  keys: readonly string[],
  path: string,
): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      invalid(`${path}.${key}`, 'is not a supported field');
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      invalid(`${path}.${key}`, 'is required');
    }
  }
}

function assertText(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalid(path, 'must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    invalid(path, 'must not be empty');
  }
  if (trimmed.length > GAME_PROJECT_LIMITS.maxTextCharacters) {
    invalid(path, `must be at most ${GAME_PROJECT_LIMITS.maxTextCharacters} characters`);
  }
  return trimmed;
}

function assertId(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.length > GAME_PROJECT_LIMITS.maxIdCharacters ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    invalid(path, 'must be a safe ASCII identifier');
  }
  return value;
}

function assertIsoDateTime(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalid(path, 'must be an ISO datetime string');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    invalid(path, 'must be a normalized ISO datetime string');
  }
  return value;
}

function assertTextList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array');
  }
  if (value.length === 0) {
    invalid(path, 'must contain at least one item');
  }
  if (value.length > GAME_PROJECT_LIMITS.maxListItems) {
    invalid(path, `must contain at most ${GAME_PROJECT_LIMITS.maxListItems} items`);
  }

  const result = value.map((item, index) => assertText(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) {
    invalid(path, 'must not contain duplicate items');
  }
  return result;
}

function validateOverview(value: unknown): GameProjectOverview {
  const overview = assertRecord(value, 'project.overview');
  assertExactKeys(overview, OVERVIEW_KEYS, 'project.overview');

  const duration = overview.estimatedPlayTimeMinutes;
  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > GAME_PROJECT_LIMITS.maxEstimatedPlayTimeMinutes
  ) {
    invalid(
      'project.overview.estimatedPlayTimeMinutes',
      `must be an integer between 1 and ${GAME_PROJECT_LIMITS.maxEstimatedPlayTimeMinutes}`,
    );
  }

  if (
    typeof overview.completionStatus !== 'string' ||
    !GAME_PROJECT_COMPLETION_STATUSES.some((status) => status === overview.completionStatus)
  ) {
    invalid('project.overview.completionStatus', 'is not a supported completion status');
  }

  return {
    title: assertText(overview.title, 'project.overview.title'),
    oneLineDescription: assertText(
      overview.oneLineDescription,
      'project.overview.oneLineDescription',
    ),
    genre: assertText(overview.genre, 'project.overview.genre'),
    coreAction: assertText(overview.coreAction, 'project.overview.coreAction'),
    winCondition: assertText(overview.winCondition, 'project.overview.winCondition'),
    failureCondition: assertText(
      overview.failureCondition,
      'project.overview.failureCondition',
    ),
    estimatedPlayTimeMinutes: duration,
    completionStatus: overview.completionStatus as GameProjectCompletionStatus,
    nextTask: assertText(overview.nextTask, 'project.overview.nextTask'),
  };
}

function validateDesign(value: unknown): GameDesign {
  const design = assertRecord(value, 'project.design');
  assertExactKeys(design, DESIGN_KEYS, 'project.design');

  return {
    objective: assertText(design.objective, 'project.design.objective'),
    gameplayLoop: assertTextList(design.gameplayLoop, 'project.design.gameplayLoop'),
    coreRules: assertTextList(design.coreRules, 'project.design.coreRules'),
    controls: assertTextList(design.controls, 'project.design.controls'),
    difficultyProgression: assertText(
      design.difficultyProgression,
      'project.design.difficultyProgression',
    ),
    scoringSystem: assertText(design.scoringSystem, 'project.design.scoringSystem'),
    endConditions: assertTextList(design.endConditions, 'project.design.endConditions'),
    minimumViableFeatures: assertTextList(
      design.minimumViableFeatures,
      'project.design.minimumViableFeatures',
    ),
    futureFeatures: assertTextList(design.futureFeatures, 'project.design.futureFeatures'),
  };
}

export function validateGameProject(value: unknown): GameProject {
  const project = assertRecord(value, 'project');
  assertExactKeys(project, PROJECT_KEYS, 'project');

  if (project.source !== 'mock') {
    invalid('project.source', 'must be mock');
  }

  const createdAt = assertIsoDateTime(project.createdAt, 'project.createdAt');
  const updatedAt = assertIsoDateTime(project.updatedAt, 'project.updatedAt');
  if (updatedAt < createdAt) {
    invalid('project.updatedAt', 'must not be earlier than project.createdAt');
  }

  return {
    id: assertId(project.id, 'project.id'),
    initialIdea: assertText(project.initialIdea, 'project.initialIdea'),
    overview: validateOverview(project.overview),
    design: validateDesign(project.design),
    source: 'mock',
    createdAt,
    updatedAt,
  };
}

function summarizeForDisplay(value: string, maximum: number): string {
  if (value.length <= maximum) {
    return value;
  }
  return `${value.slice(0, maximum - 1).trimEnd()}…`;
}

function inferGenre(idea: string): string {
  if (/플랫폼|platform/i.test(idea)) return '2D 플랫폼';
  if (/비주얼\s*노벨|visual\s*novel|선택지/i.test(idea)) return '비주얼 노벨';
  if (/퍼즐|추리|단서|puzzle|mystery/i.test(idea)) return '탑다운 퍼즐 어드벤처';
  if (/슈팅|우주선|운석|shoot|asteroid/i.test(idea)) return '2D 아케이드 슈팅';
  if (/탑다운|어드벤처|탐색|adventure/i.test(idea)) return '탑다운 어드벤처';
  return '짧은 2D 내러티브 게임';
}

function inferTitle(idea: string): string {
  if (/비.*서울|서울.*비/i.test(idea)) return 'Rainwalk Seoul';
  if (/우주선|운석|asteroid/i.test(idea)) return 'Meteor Passage';
  if (/중세.*서재|서재.*단서|archive/i.test(idea)) return 'Midnight Archive';
  if (/고양이.*책|책.*고양이/i.test(idea)) return 'The Book Collector';

  const compact = idea
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  return summarizeForDisplay(compact || 'Untitled Atelier', 80);
}

function inferDuration(response: string): number {
  if (/한\s*시간|1\s*시간/.test(response)) return 60;

  const numeric = /\d{1,4}/.exec(response);
  if (numeric) {
    return Math.min(
      GAME_PROJECT_LIMITS.maxEstimatedPlayTimeMinutes,
      Math.max(1, Number(numeric[0])),
    );
  }

  const KoreanDuration: readonly [RegExp, number][] = [
    [/삼십/, 30],
    [/이십/, 20],
    [/십/, 10],
    [/오/, 5],
  ];
  return KoreanDuration.find(([pattern]) => pattern.test(response))?.[1] ?? 10;
}

function inferControls(genre: string): string[] {
  if (genre.includes('플랫폼')) {
    return ['방향키 또는 A/D로 이동', 'Space로 점프'];
  }
  if (genre.includes('슈팅')) {
    return ['WASD 또는 방향키로 이동', 'Space로 주 행동 실행'];
  }
  if (genre.includes('비주얼 노벨')) {
    return ['마우스 왼쪽 버튼으로 대화 진행', '숫자 키로 선택지 결정'];
  }
  return ['WASD 또는 방향키로 이동', 'E 또는 Space로 조사하고 상호작용'];
}

function inferScoringSystem(genre: string): string {
  if (genre.includes('슈팅')) {
    return '장애물 회피와 목표 달성에 점수를 부여하고, 충돌 시 연속 보너스를 초기화한다.';
  }
  if (genre.includes('플랫폼')) {
    return '필수 수집품과 선택 수집품을 분리해 수집률로 플레이 결과를 보여준다.';
  }
  if (genre.includes('비주얼 노벨')) {
    return '숫자 점수 대신 주요 선택과 도달한 결말을 기록한다.';
  }
  return '발견한 단서와 해결한 목표의 수를 진행 지표로 사용한다.';
}

export function createRuleBasedGameProject(
  session: unknown,
  options: RuleBasedGameProjectOptions,
): GameProject {
  const validSession = validateGameIdeationSession(session);
  if (validSession.answers.length !== GAME_IDEATION_QUESTIONS.length) {
    throw new GameProjectValidationError(
      'All five game ideation questions must be answered before creating a project.',
    );
  }

  const coreAction = getGameIdeationAnswer(validSession, 'player-action');
  const winCondition = getGameIdeationAnswer(validSession, 'completion');
  const failureCondition = getGameIdeationAnswer(validSession, 'failure');
  const atmosphere = getGameIdeationAnswer(validSession, 'atmosphere');
  const durationResponse = getGameIdeationAnswer(validSession, 'play-time');
  const genre = inferGenre(validSession.initialIdea);
  const timestamp =
    options.now instanceof Date ? options.now.toISOString() : assertIsoDateTime(options.now, 'now');
  const estimatedPlayTimeMinutes = inferDuration(durationResponse);

  return validateGameProject({
    id: options.id,
    initialIdea: validSession.initialIdea,
    overview: {
      title: inferTitle(validSession.initialIdea),
      oneLineDescription: `${summarizeForDisplay(atmosphere, 180)} 속에서 ${summarizeForDisplay(coreAction, 180)} 목표를 수행하는 ${estimatedPlayTimeMinutes}분 내외의 게임.`,
      genre,
      coreAction,
      winCondition,
      failureCondition,
      estimatedPlayTimeMinutes,
      completionStatus: 'design-draft',
      nextTask: '최소 기능 버전에서 핵심 행동 한 가지가 재미있는지 먼저 검증한다.',
    },
    design: {
      objective: winCondition,
      gameplayLoop: [
        '짧은 시작 화면에서 목표를 확인한다.',
        coreAction,
        '행동 결과를 즉시 확인하고 다음 판단을 한다.',
        winCondition,
      ],
      coreRules: [
        `핵심 행동: ${coreAction}`,
        `완료 기준: ${winCondition}`,
        `실패 기준: ${failureCondition}`,
      ],
      controls: inferControls(genre),
      difficultyProgression: `${atmosphere} 분위기를 유지하면서 후반부에 판단 속도와 목표 밀도를 한 단계 높인다.`,
      scoringSystem: inferScoringSystem(genre),
      endConditions: [`성공: ${winCondition}`, `실패: ${failureCondition}`],
      minimumViableFeatures: [
        '플레이어 이동 또는 핵심 입력',
        '핵심 행동 한 가지',
        '성공 조건 판정',
        '실패 조건 판정',
        '시작과 결과 화면',
      ],
      futureFeatures: [
        '추가 스테이지 또는 장면',
        '분위기를 강화하는 사운드와 시각 효과',
        '선택 규칙 또는 보조 목표',
      ],
    },
    source: 'mock',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
