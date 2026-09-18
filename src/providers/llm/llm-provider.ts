import type {
  GameIdeationSession,
  GameIdeationTurn,
} from '../../domain/game-ideation';
import type { GameProject } from '../../domain/game-project';

export interface LLMProvider {
  startGameIdeation(initialIdea: string): Promise<GameIdeationTurn>;
  answerQuestion(session: GameIdeationSession, response: string): Promise<GameIdeationTurn>;
  createGameProject(session: GameIdeationSession): Promise<GameProject>;
}
