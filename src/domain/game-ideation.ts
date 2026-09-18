export const GAME_IDEA_TEMPLATES = [
  {
    id: '2d-platformer',
    label: '2D 플랫폼 게임',
    prompt: '작은 캐릭터가 장애물을 넘고 수집품을 모으는 짧은 2D 플랫폼 게임',
  },
  {
    id: 'top-down-adventure',
    label: '탑다운 어드벤처',
    prompt: '한정된 공간을 탐색하며 단서를 찾는 탑다운 어드벤처',
  },
  {
    id: 'puzzle-game',
    label: '퍼즐 게임',
    prompt: '간단한 규칙을 조합해 방을 탈출하는 퍼즐 게임',
  },
  {
    id: 'visual-novel',
    label: '비주얼 노벨',
    prompt: '선택에 따라 짧은 결말이 달라지는 분위기 중심 비주얼 노벨',
  },
  {
    id: 'simple-shooter',
    label: '간단한 슈팅 게임',
    prompt: '다가오는 장애물을 피하고 목표물을 맞히는 간단한 2D 슈팅 게임',
  },
] as const;

export const GAME_IDEA_EXAMPLES = [
  '비 오는 서울을 걷는 짧은 감성 게임',
  '우주선으로 운석을 피하는 2D 게임',
  '중세 서재에서 단서를 찾는 추리 게임',
  '고양이가 책을 모으는 플랫폼 게임',
] as const;

export const GAME_IDEATION_QUESTIONS = [
  { id: 'player-action', prompt: '플레이어가 무엇을 하나요?' },
  { id: 'completion', prompt: '게임은 언제 끝나나요?' },
  { id: 'failure', prompt: '실패 조건은 무엇인가요?' },
  { id: 'atmosphere', prompt: '어떤 분위기를 원하나요?' },
  { id: 'play-time', prompt: '한 번 플레이하는 데 몇 분 정도 걸리나요?' },
] as const;

export const GAME_IDEATION_LIMITS = Object.freeze({
  maxInitialIdeaCharacters: 2_000,
  maxAnswerCharacters: 2_000,
});

export type GameIdeaTemplateId = (typeof GAME_IDEA_TEMPLATES)[number]['id'];
export type GameIdeationQuestionId = (typeof GAME_IDEATION_QUESTIONS)[number]['id'];

export interface GameIdeationQuestion {
  id: GameIdeationQuestionId;
  prompt: string;
}

export interface GameIdeationAnswer {
  questionId: GameIdeationQuestionId;
  question: string;
  response: string;
}

export interface GameIdeationSession {
  initialIdea: string;
  answers: readonly GameIdeationAnswer[];
}

export interface GameIdeationProgress {
  answered: number;
  total: number;
}

export interface GameIdeationTurn {
  session: GameIdeationSession;
  question: GameIdeationQuestion | null;
  isComplete: boolean;
  progress: GameIdeationProgress;
}

export class GameIdeationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameIdeationValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyText(value: unknown, maximum: number, path: string): string {
  if (typeof value !== 'string') {
    throw new GameIdeationValidationError(`${path} must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new GameIdeationValidationError(`${path} must not be empty.`);
  }
  if (trimmed.length > maximum) {
    throw new GameIdeationValidationError(`${path} must be at most ${maximum} characters.`);
  }
  return trimmed;
}

export function createGameIdeationSession(initialIdea: string): GameIdeationSession {
  return {
    initialIdea: assertNonEmptyText(
      initialIdea,
      GAME_IDEATION_LIMITS.maxInitialIdeaCharacters,
      'initialIdea',
    ),
    answers: [],
  };
}

export function validateGameIdeationSession(value: unknown): GameIdeationSession {
  if (!isRecord(value)) {
    throw new GameIdeationValidationError('session must be an object.');
  }

  const initialIdea = assertNonEmptyText(
    value.initialIdea,
    GAME_IDEATION_LIMITS.maxInitialIdeaCharacters,
    'session.initialIdea',
  );
  if (!Array.isArray(value.answers)) {
    throw new GameIdeationValidationError('session.answers must be an array.');
  }
  if (value.answers.length > GAME_IDEATION_QUESTIONS.length) {
    throw new GameIdeationValidationError('session.answers contains too many answers.');
  }

  const answers = value.answers.map((answerValue, index): GameIdeationAnswer => {
    if (!isRecord(answerValue)) {
      throw new GameIdeationValidationError(`session.answers[${index}] must be an object.`);
    }
    const expectedQuestion = GAME_IDEATION_QUESTIONS[index];
    if (
      answerValue.questionId !== expectedQuestion.id ||
      answerValue.question !== expectedQuestion.prompt
    ) {
      throw new GameIdeationValidationError(
        `session.answers[${index}] does not match the required question order.`,
      );
    }

    return {
      questionId: expectedQuestion.id,
      question: expectedQuestion.prompt,
      response: assertNonEmptyText(
        answerValue.response,
        GAME_IDEATION_LIMITS.maxAnswerCharacters,
        `session.answers[${index}].response`,
      ),
    };
  });

  return { initialIdea, answers };
}

export function getNextGameIdeationQuestion(
  session: unknown,
): GameIdeationQuestion | null {
  const validSession = validateGameIdeationSession(session);
  const question = GAME_IDEATION_QUESTIONS[validSession.answers.length];
  return question ? { ...question } : null;
}

export function createGameIdeationTurn(session: unknown): GameIdeationTurn {
  const validSession = validateGameIdeationSession(session);
  const question = getNextGameIdeationQuestion(validSession);
  return {
    session: validSession,
    question,
    isComplete: question === null,
    progress: {
      answered: validSession.answers.length,
      total: GAME_IDEATION_QUESTIONS.length,
    },
  };
}

export function appendGameIdeationAnswer(
  session: unknown,
  response: string,
): GameIdeationSession {
  const validSession = validateGameIdeationSession(session);
  const question = GAME_IDEATION_QUESTIONS[validSession.answers.length];
  if (!question) {
    throw new GameIdeationValidationError('The game ideation conversation is already complete.');
  }

  return {
    initialIdea: validSession.initialIdea,
    answers: [
      ...validSession.answers,
      {
        questionId: question.id,
        question: question.prompt,
        response: assertNonEmptyText(
          response,
          GAME_IDEATION_LIMITS.maxAnswerCharacters,
          'response',
        ),
      },
    ],
  };
}

export function getGameIdeationAnswer(
  session: unknown,
  questionId: GameIdeationQuestionId,
): string {
  const validSession = validateGameIdeationSession(session);
  return validSession.answers.find((answer) => answer.questionId === questionId)?.response ?? '';
}
