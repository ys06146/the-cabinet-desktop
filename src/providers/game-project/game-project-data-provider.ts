import type { GameAtelierDataV2 } from '../../domain/game-atelier-data';
import type { GameProject } from '../../domain/game-project';
import type { GameProjectWorkspace } from '../../domain/game-project-workspace';

export interface GameProjectDataProvider {
  load(): Promise<GameAtelierDataV2>;
  loadWorkspace(projectId: string): Promise<GameProjectWorkspace | null>;
  saveProject(project: GameProject): Promise<GameAtelierDataV2>;
  saveWorkspace(
    projectId: string,
    workspace: GameProjectWorkspace,
  ): Promise<GameAtelierDataV2>;
}
