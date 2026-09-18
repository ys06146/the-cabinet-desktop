import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IPC_CHANNELS,
  type CabinetBridge,
  type GetGameProjectWorkspaceRequest,
  type MarketResearchExportResult,
  type MarketResearchImportResult,
  type RendererErrorReport,
  type RuntimeInfo,
  type SaveGameProjectRequest,
  type SaveGameProjectWorkspaceRequest,
  type SaveInvestmentMemoRequest,
  type SetNewsSavedRequest,
  type UpdatePreparationRequest,
  type UpdatePreparationResponse,
} from '../shared/ipc';
import type { UpdateInstallResult, UpdateState } from '../shared/update';
import type { MarketResearchDataV1 } from '../../src/domain/market-research-data';
import type { GameAtelierDataV2 } from '../../src/domain/game-atelier-data';
import type { GameProjectWorkspace } from '../../src/domain/game-project-workspace';

const bridge: CabinetBridge = Object.freeze({
  getRuntimeInfo: (): Promise<RuntimeInfo> => ipcRenderer.invoke(IPC_CHANNELS.getRuntimeInfo),
  reportRendererError: (report: RendererErrorReport): void => {
    ipcRenderer.send(IPC_CHANNELS.reportRendererError, {
      message: report.message,
      stack: report.stack,
    });
  },
  getMarketResearchData: (): Promise<MarketResearchDataV1> =>
    ipcRenderer.invoke(IPC_CHANNELS.getMarketResearchData),
  saveInvestmentMemo: (
    request: SaveInvestmentMemoRequest,
  ): Promise<MarketResearchDataV1> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveInvestmentMemo, request),
  setNewsSaved: (request: SetNewsSavedRequest): Promise<MarketResearchDataV1> =>
    ipcRenderer.invoke(IPC_CHANNELS.setNewsSaved, request),
  exportMarketResearchData: (): Promise<MarketResearchExportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.exportMarketResearchData),
  importMarketResearchData: (): Promise<MarketResearchImportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.importMarketResearchData),
  getGameAtelierData: (): Promise<GameAtelierDataV2> =>
    ipcRenderer.invoke(IPC_CHANNELS.getGameAtelierData),
  getGameProjectWorkspace: (
    request: GetGameProjectWorkspaceRequest,
  ): Promise<GameProjectWorkspace | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.getGameProjectWorkspace, request),
  saveGameProject: (request: SaveGameProjectRequest): Promise<GameAtelierDataV2> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveGameProject, request),
  saveGameProjectWorkspace: (
    request: SaveGameProjectWorkspaceRequest,
  ): Promise<GameAtelierDataV2> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveGameProjectWorkspace, request),
  getUpdateState: (): Promise<UpdateState> =>
    ipcRenderer.invoke(IPC_CHANNELS.getUpdateState),
  checkForUpdates: (): Promise<UpdateState> =>
    ipcRenderer.invoke(IPC_CHANNELS.checkForUpdates),
  downloadUpdate: (): Promise<UpdateState> =>
    ipcRenderer.invoke(IPC_CHANNELS.downloadUpdate),
  installUpdate: (): Promise<UpdateInstallResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.installUpdate),
  onUpdateStateChanged: (listener: (state: UpdateState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, state: UpdateState): void => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.updateStateChanged, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.updateStateChanged, handler);
  },
  onPrepareUpdateInstall: (
    listener: (request: UpdatePreparationRequest) => void,
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      request: UpdatePreparationRequest,
    ): void => {
      listener(request);
    };
    ipcRenderer.on(IPC_CHANNELS.prepareUpdateInstall, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.prepareUpdateInstall, handler);
  },
  completeUpdatePreparation: (
    response: UpdatePreparationResponse,
  ): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.completeUpdatePreparation, response),
});

contextBridge.exposeInMainWorld('theCabinet', bridge);
