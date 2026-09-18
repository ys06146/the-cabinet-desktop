import {
  appendGameIdeationAnswer,
  createGameIdeationSession,
  createGameIdeationTurn,
  type GameIdeationSession,
  type GameIdeationTurn,
} from '../../domain/game-ideation';
import {
  createRuleBasedGameProject,
  type GameProject,
} from '../../domain/game-project';
import type { LLMProvider } from '../llm/llm-provider';
import {
  MockProviderSimulator,
  type MockProviderSimulationOptions,
} from './mock-provider-simulator';

export type MockLLMOperation = 'start' | 'answer' | 'create-project';

export interface MockLLMProviderOptions
  extends MockProviderSimulationOptions<MockLLMOperation> {
  now?: () => Date;
  createId?: (now: Date, sequence: number) => string;
}

export class MockLLMProviderError extends Error {
  constructor(operation: MockLLMOperation) {
    super(`Mock LLM request failed during ${operation}.`);
    this.name = 'MockLLMProviderError';
  }
}

function createDefaultId(now: Date, sequence: number): string {
  return `game-${now.getTime().toString(36)}-${sequence.toString(36)}`;
}

export class MockLLMProvider implements LLMProvider {
  private readonly simulator: MockProviderSimulator<MockLLMOperation>;
  private readonly now: () => Date;
  private readonly createId: (now: Date, sequence: number) => string;
  private projectSequence = 0;

  constructor(options: MockLLMProviderOptions = {}) {
    this.simulator = new MockProviderSimulator(
      options,
      (operation) => new MockLLMProviderError(operation),
    );
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? createDefaultId;
  }

  startGameIdeation(initialIdea: string): Promise<GameIdeationTurn> {
    return this.simulator.execute('start', () =>
      createGameIdeationTurn(createGameIdeationSession(initialIdea)),
    );
  }

  answerQuestion(
    session: GameIdeationSession,
    response: string,
  ): Promise<GameIdeationTurn> {
    return this.simulator.execute('answer', () =>
      createGameIdeationTurn(appendGameIdeationAnswer(session, response)),
    );
  }

  createGameProject(session: GameIdeationSession): Promise<GameProject> {
    return this.simulator.execute('create-project', () => {
      const now = this.now();
      this.projectSequence += 1;
      return createRuleBasedGameProject(session, {
        id: this.createId(now, this.projectSequence),
        now,
      });
    });
  }
}

export const mockLLMProvider = new MockLLMProvider();
