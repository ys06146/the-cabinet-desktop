import {
  createGameIdeationTurn,
  GAME_IDEATION_LIMITS,
  type GameIdeationSession,
  type GameIdeationTurn,
} from '../../domain/game-ideation';

const STORAGE_KEY = 'the-cabinet:game-atelier-draft:v1';
const MAX_SERIALIZED_CHARACTERS = 24_000;

interface DraftStorage {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

interface StoredGameAtelierDraftV1 {
  dataVersion: 1;
  screen: 'start' | 'conversation';
  idea: string;
  answer: string;
  session: GameIdeationSession | null;
}

export interface GameAtelierDraft {
  screen: 'start' | 'conversation';
  idea: string;
  answer: string;
  turn: GameIdeationTurn | null;
}

function validateLooseText(value: unknown, maximum: number, label: string): string {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

export class GameAtelierDraftService {
  constructor(private readonly storage: DraftStorage) {}

  load(): GameAtelierDraft | null {
    const serialized = this.storage.getItem(STORAGE_KEY);
    if (!serialized) {
      return null;
    }
    if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
      this.storage.removeItem(STORAGE_KEY);
      return null;
    }

    try {
      const value = JSON.parse(serialized) as Partial<StoredGameAtelierDraftV1>;
      if (
        !value ||
        typeof value !== 'object' ||
        value.dataVersion !== 1 ||
        (value.screen !== 'start' && value.screen !== 'conversation')
      ) {
        throw new Error('Unsupported draft');
      }
      const idea = validateLooseText(
        value.idea,
        GAME_IDEATION_LIMITS.maxInitialIdeaCharacters,
        'idea',
      );
      const answer = validateLooseText(
        value.answer,
        GAME_IDEATION_LIMITS.maxAnswerCharacters,
        'answer',
      );
      if (value.screen === 'start') {
        return { screen: 'start', idea, answer: '', turn: null };
      }
      const turn = createGameIdeationTurn(value.session);
      if (turn.isComplete) {
        throw new Error('Completed conversations are not drafts');
      }
      return {
        screen: 'conversation',
        idea: turn.session.initialIdea,
        answer,
        turn,
      };
    } catch {
      this.storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  save(draft: GameAtelierDraft): void {
    if (draft.screen === 'start' && draft.idea.length === 0) {
      this.clear();
      return;
    }
    const stored: StoredGameAtelierDraftV1 = {
      dataVersion: 1,
      screen: draft.screen,
      idea: validateLooseText(
        draft.idea,
        GAME_IDEATION_LIMITS.maxInitialIdeaCharacters,
        'idea',
      ),
      answer: validateLooseText(
        draft.answer,
        GAME_IDEATION_LIMITS.maxAnswerCharacters,
        'answer',
      ),
      session: draft.screen === 'conversation' ? draft.turn?.session ?? null : null,
    };
    if (draft.screen === 'conversation') {
      const turn = createGameIdeationTurn(stored.session);
      if (turn.isComplete) {
        throw new Error('Completed conversations are not drafts');
      }
    }
    const serialized = JSON.stringify(stored);
    if (serialized.length > MAX_SERIALIZED_CHARACTERS) {
      throw new Error('미완료 게임 입력이 허용된 저장 크기를 초과했습니다.');
    }
    this.storage.setItem(STORAGE_KEY, serialized);
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}

export function createBrowserGameAtelierDraftService(): GameAtelierDraftService {
  return new GameAtelierDraftService(window.localStorage);
}
