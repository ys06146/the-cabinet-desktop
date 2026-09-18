import type { GameProjectDataProvider } from './game-project-data-provider';

export const electronGameProjectDataProvider: GameProjectDataProvider = {
  load: () => window.theCabinet.getGameAtelierData(),
  loadWorkspace: (projectId) => window.theCabinet.getGameProjectWorkspace({ projectId }),
  saveProject: (project) => window.theCabinet.saveGameProject({ project }),
  saveWorkspace: (projectId, workspace) =>
    window.theCabinet.saveGameProjectWorkspace({ projectId, workspace }),
};
