import type {
  GameIdeationSession,
  GameIdeationTurn,
} from '../../domain/game-ideation';
import {
  validateGameProject,
  type GameProject,
} from '../../domain/game-project';
import type { LLMProvider } from '../../providers/llm/llm-provider';
import { MIDNIGHT_ARCHIVE_PROJECT } from '../../providers/mock/game-project-fixtures';
import { mockLLMProvider } from '../../providers/mock/mock-llm-provider';

export class GameAtelierService {
  constructor(private readonly llmProvider: LLMProvider) {}

  startGameIdeation(initialIdea: string): Promise<GameIdeationTurn> {
    return this.llmProvider.startGameIdeation(initialIdea);
  }

  answerQuestion(
    session: GameIdeationSession,
    response: string,
  ): Promise<GameIdeationTurn> {
    return this.llmProvider.answerQuestion(session, response);
  }

  createGameProject(session: GameIdeationSession): Promise<GameProject> {
    return this.llmProvider.createGameProject(session);
  }

  getBuiltInProjects(): readonly GameProject[] {
    return [validateGameProject(MIDNIGHT_ARCHIVE_PROJECT)];
  }
}

export const gameAtelierService = new GameAtelierService(mockLLMProvider);
