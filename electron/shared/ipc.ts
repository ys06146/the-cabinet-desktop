import type {
  InvestmentMemo,
  MarketResearchDataV1,
} from '../../src/domain/market-research-data';
import type { GameAtelierDataV2 } from '../../src/domain/game-atelier-data';
import type { GameProject } from '../../src/domain/game-project';
import type { GameProjectWorkspace } from '../../src/domain/game-project-workspace';
import type { UpdateInstallResult, UpdateState } from './update';

export const IPC_CHANNELS = {
  getRuntimeInfo: 'app:get-runtime-info',
  reportRendererError: 'app:report-renderer-error',
  getMarketResearchData: 'market-research:get-data',
  saveInvestmentMemo: 'market-research:save-memo',
  setNewsSaved: 'market-research:set-news-saved',
  exportMarketResearchData: 'market-research:export-json',
  importMarketResearchData: 'market-research:import-json',
  getGameAtelierData: 'game-atelier:get-data',
  getGameProjectWorkspace: 'game-atelier:get-project-workspace',
  saveGameProject: 'game-atelier:save-project',
  saveGameProjectWorkspace: 'game-atelier:save-project-workspace',
  getUpdateState: 'update:get-state',
  checkForUpdates: 'update:check',
  downloadUpdate: 'update:download',
  installUpdate: 'update:install',
  updateStateChanged: 'update:state-changed',
  prepareUpdateInstall: 'update:prepare-install',
  completeUpdatePreparation: 'update:complete-preparation',
} as const;

export type AppEnvironmentName = 'development' | 'production';

export interface RuntimeInfo {
  appName: string;
  version: string;
  environment: AppEnvironmentName;
  platform: string;
}

export interface RendererErrorReport {
  message: string;
  stack?: string;
}

export interface SaveInvestmentMemoRequest {
  symbol: string;
  memo: InvestmentMemo;
}

export interface SetNewsSavedRequest {
  newsId: string;
  isSaved: boolean;
}

export interface SaveGameProjectRequest {
  project: GameProject;
}

export interface GetGameProjectWorkspaceRequest {
  projectId: string;
}

export interface SaveGameProjectWorkspaceRequest {
  projectId: string;
  workspace: GameProjectWorkspace;
}

export interface UpdatePreparationRequest {
  requestId: number;
}

export interface UpdatePreparationResponse {
  requestId: number;
  success: boolean;
  message?: string;
}

export type MarketResearchExportResult =
  | { status: 'cancelled' }
  | {
      status: 'exported';
      investmentMemoCount: number;
      savedNewsCount: number;
    };

export type MarketResearchImportResult =
  | { status: 'cancelled' }
  | {
      status: 'imported';
      data: MarketResearchDataV1;
      investmentMemoCount: number;
      savedNewsCount: number;
    };

export interface CabinetBridge {
  getRuntimeInfo: () => Promise<RuntimeInfo>;
  reportRendererError: (report: RendererErrorReport) => void;
  getMarketResearchData: () => Promise<MarketResearchDataV1>;
  saveInvestmentMemo: (
    request: SaveInvestmentMemoRequest,
  ) => Promise<MarketResearchDataV1>;
  setNewsSaved: (request: SetNewsSavedRequest) => Promise<MarketResearchDataV1>;
  exportMarketResearchData: () => Promise<MarketResearchExportResult>;
  importMarketResearchData: () => Promise<MarketResearchImportResult>;
  getGameAtelierData: () => Promise<GameAtelierDataV2>;
  getGameProjectWorkspace: (
    request: GetGameProjectWorkspaceRequest,
  ) => Promise<GameProjectWorkspace | null>;
  saveGameProject: (request: SaveGameProjectRequest) => Promise<GameAtelierDataV2>;
  saveGameProjectWorkspace: (
    request: SaveGameProjectWorkspaceRequest,
  ) => Promise<GameAtelierDataV2>;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  installUpdate: () => Promise<UpdateInstallResult>;
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => () => void;
  onPrepareUpdateInstall: (
    listener: (request: UpdatePreparationRequest) => void,
  ) => () => void;
  completeUpdatePreparation: (
    response: UpdatePreparationResponse,
  ) => Promise<boolean>;
}
