import { validateGameProject, type GameProject } from '../../domain/game-project';
import {
  validateGameProjectWorkspace,
  validateGameProjectWorkspaceKey,
  type GameProjectWorkspace,
} from '../../domain/game-project-workspace';
import type { GameAtelierDataV2 } from '../../domain/game-atelier-data';
import { electronGameProjectDataProvider } from '../../providers/game-project/electron-game-project-data-provider';
import type { GameProjectDataProvider } from '../../providers/game-project/game-project-data-provider';

export class GameProjectDataService {
  constructor(private readonly provider: GameProjectDataProvider) {}

  load(): Promise<GameAtelierDataV2> {
    return this.provider.load();
  }

  loadWorkspace(projectId: string): Promise<GameProjectWorkspace | null> {
    return this.provider.loadWorkspace(validateGameProjectWorkspaceKey(projectId));
  }

  save(project: GameProject): Promise<GameAtelierDataV2> {
    return this.provider.saveProject(validateGameProject(project));
  }

  saveWorkspace(
    projectId: string,
    workspace: GameProjectWorkspace,
  ): Promise<GameAtelierDataV2> {
    return this.provider.saveWorkspace(
      validateGameProjectWorkspaceKey(projectId),
      validateGameProjectWorkspace(workspace),
    );
  }
}

export const gameProjectDataService = new GameProjectDataService(
  electronGameProjectDataProvider,
);
