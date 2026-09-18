import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';
import { closeSync, fstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import {
  MARKET_RESEARCH_LIMITS,
  MarketResearchDataError,
  validateInvestmentMemo,
} from '../../src/domain/market-research-data';
import { GameAtelierDataError } from '../../src/domain/game-atelier-data';
import {
  GameProjectValidationError,
  validateGameProject,
} from '../../src/domain/game-project';
import {
  GameProjectWorkspaceValidationError,
  validateGameProjectWorkspace,
  validateGameProjectWorkspaceKey,
} from '../../src/domain/game-project-workspace';
import {
  IPC_CHANNELS,
  type GetGameProjectWorkspaceRequest,
  type MarketResearchExportResult,
  type MarketResearchImportResult,
  type RendererErrorReport,
  type RuntimeInfo,
  type SaveGameProjectRequest,
  type SaveGameProjectWorkspaceRequest,
  type SaveInvestmentMemoRequest,
  type SetNewsSavedRequest,
} from '../shared/ipc';
import type { EnvironmentConfig } from './environment';
import { logger } from './logger';
import type { GameAtelierStore } from './game-atelier-store';
import type { MarketResearchStore } from './market-research-store';
import { PRODUCTION_RENDERER_URL } from './renderer-protocol';

export function isTrustedSender(url: string, config: EnvironmentConfig): boolean {
  try {
    const parsedUrl = new URL(url);
    if (config.name === 'development' && config.rendererUrl) {
      return parsedUrl.origin === new URL(config.rendererUrl).origin;
    }
    parsedUrl.hash = '';
    parsedUrl.search = '';
    return parsedUrl.href === PRODUCTION_RENDERER_URL;
  } catch {
    return false;
  }
}

export function assertTrustedSender(
  event: IpcMainInvokeEvent | IpcMainEvent,
  config: EnvironmentConfig,
): void {
  const senderFrame = event.senderFrame;
  const senderUrl = senderFrame?.url ?? '';
  const isMainFrame = senderFrame !== null && senderFrame === event.sender.mainFrame;
  if (!isMainFrame || !isTrustedSender(senderUrl, config)) {
    logger.warn('Rejected IPC from an untrusted sender', { senderUrl, isMainFrame });
    throw new Error('Untrusted IPC sender');
  }
}

function sanitizeErrorReport(value: unknown): RendererErrorReport | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<RendererErrorReport>;
  if (typeof candidate.message !== 'string' || candidate.message.trim().length === 0) {
    return undefined;
  }

  return {
    message: candidate.message.slice(0, 2_000),
    stack: typeof candidate.stack === 'string' ? candidate.stack.slice(0, 8_000) : undefined,
  };
}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function sanitizeMemoRequest(value: unknown): SaveInvestmentMemoRequest {
  const candidate = assertPlainObject(value, 'Memo request');
  if (typeof candidate.symbol !== 'string') {
    throw new TypeError('Memo request symbol must be a string');
  }
  return {
    symbol: candidate.symbol,
    memo: validateInvestmentMemo(candidate.memo),
  };
}

function sanitizeNewsSavedRequest(value: unknown): SetNewsSavedRequest {
  const candidate = assertPlainObject(value, 'Saved news request');
  if (typeof candidate.newsId !== 'string' || typeof candidate.isSaved !== 'boolean') {
    throw new TypeError('Saved news request is invalid');
  }
  return { newsId: candidate.newsId, isSaved: candidate.isSaved };
}

function sanitizeGameProjectRequest(value: unknown): SaveGameProjectRequest {
  const candidate = assertPlainObject(value, 'Game project request');
  if (Object.keys(candidate).length !== 1 || !Object.hasOwn(candidate, 'project')) {
    throw new TypeError('Game project request must contain only project');
  }
  return { project: validateGameProject(candidate.project) };
}

function sanitizeGameProjectWorkspaceKeyRequest(
  value: unknown,
): GetGameProjectWorkspaceRequest {
  const candidate = assertPlainObject(value, 'Game project workspace request');
  if (Object.keys(candidate).length !== 1 || !Object.hasOwn(candidate, 'projectId')) {
    throw new TypeError('Game project workspace request must contain only projectId');
  }
  return { projectId: validateGameProjectWorkspaceKey(candidate.projectId) };
}

function sanitizeGameProjectWorkspaceRequest(
  value: unknown,
): SaveGameProjectWorkspaceRequest {
  const candidate = assertPlainObject(value, 'Game project workspace request');
  if (
    Object.keys(candidate).length !== 2 ||
    !Object.hasOwn(candidate, 'projectId') ||
    !Object.hasOwn(candidate, 'workspace')
  ) {
    throw new TypeError(
      'Game project workspace request must contain only projectId and workspace',
    );
  }
  return {
    projectId: validateGameProjectWorkspaceKey(candidate.projectId),
    workspace: validateGameProjectWorkspace(candidate.workspace),
  };
}

function getOwnerWindow(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

function showSaveDialog(event: IpcMainInvokeEvent, options: SaveDialogOptions) {
  const owner = getOwnerWindow(event);
  return owner ? dialog.showSaveDialog(owner, options) : dialog.showSaveDialog(options);
}

function showOpenDialog(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  const owner = getOwnerWindow(event);
  return owner ? dialog.showOpenDialog(owner, options) : dialog.showOpenDialog(options);
}

function readResearchImportFile(filePath: string): string {
  if (extname(filePath).toLowerCase() !== '.json') {
    throw new MarketResearchDataError('INVALID_DATA', 'Import file must use .json');
  }

  const descriptor = openSync(filePath, 'r');
  try {
    const file = fstatSync(descriptor);
    if (!file.isFile()) {
      throw new MarketResearchDataError('INVALID_DATA', 'Import path must be a regular file');
    }
    if (file.size > MARKET_RESEARCH_LIMITS.maxSerializedBytes) {
      throw new MarketResearchDataError('DATA_TOO_LARGE', 'Import file exceeds the byte limit');
    }

    const buffer = Buffer.alloc(file.size);
    let offset = 0;
    while (offset < buffer.length) {
      const bytesRead = readSync(descriptor, buffer, offset, buffer.length - offset, null);
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }
    return buffer.subarray(0, offset).toString('utf8');
  } finally {
    closeSync(descriptor);
  }
}

function createExportFileName(): string {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `The-Cabinet-Research-${localDate}.json`;
}

function publicResearchError(error: unknown, fallback: string): Error {
  if (error instanceof MarketResearchDataError) {
    if (error.code === 'UNSUPPORTED_VERSION') {
      return new Error('이 앱 버전에서 지원하지 않는 데이터 버전입니다.');
    }
    if (error.code === 'DATA_TOO_LARGE') {
      return new Error('가져올 JSON 파일이 허용된 크기를 초과했습니다.');
    }
    return new Error('The Cabinet 연구 데이터 형식이 올바르지 않습니다.');
  }
  return new Error(fallback);
}

function publicGameAtelierError(error: unknown, fallback: string): Error {
  if (
    error instanceof GameProjectValidationError ||
    error instanceof GameProjectWorkspaceValidationError
  ) {
    return new Error('Game Atelier 프로젝트 데이터 형식이 올바르지 않습니다.');
  }
  if (error instanceof GameAtelierDataError) {
    if (error.code === 'UNSUPPORTED_VERSION') {
      return new Error('이 앱 버전에서 지원하지 않는 Game Atelier 데이터 버전입니다.');
    }
    if (error.code === 'DATA_TOO_LARGE') {
      return new Error('저장된 Game Atelier 데이터가 허용된 크기를 초과했습니다.');
    }
    return new Error('저장된 Game Atelier 데이터 형식이 올바르지 않습니다.');
  }
  return new Error(fallback);
}

export function registerIpcHandlers(
  config: EnvironmentConfig,
  marketResearchStore: MarketResearchStore,
  gameAtelierStore: GameAtelierStore,
): void {
  ipcMain.handle(IPC_CHANNELS.getRuntimeInfo, (event): RuntimeInfo => {
    assertTrustedSender(event, config);
    return {
      appName: app.getName(),
      version: app.getVersion(),
      environment: config.name,
      platform: process.platform,
    };
  });

  ipcMain.on(IPC_CHANNELS.reportRendererError, (event, value: unknown) => {
    assertTrustedSender(event, config);
    const report = sanitizeErrorReport(value);
    if (!report) {
      logger.warn('Rejected malformed renderer error report');
      return;
    }
    logger.error(`Renderer error: ${report.message}`, report.stack);
  });

  ipcMain.handle(IPC_CHANNELS.getMarketResearchData, (event) => {
    assertTrustedSender(event, config);
    try {
      return marketResearchStore.load();
    } catch (error) {
      logger.error('Unable to load market research data', error);
      throw publicResearchError(error, '저장된 연구 데이터를 불러오지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.saveInvestmentMemo, (event, value: unknown) => {
    assertTrustedSender(event, config);
    try {
      const request = sanitizeMemoRequest(value);
      const data = marketResearchStore.saveInvestmentMemo(request.symbol, request.memo);
      logger.info('Investment memo saved', { symbol: request.symbol.trim().toUpperCase() });
      return data;
    } catch (error) {
      logger.error('Unable to save investment memo', error);
      throw publicResearchError(error, '투자 메모를 저장하지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.setNewsSaved, (event, value: unknown) => {
    assertTrustedSender(event, config);
    try {
      const request = sanitizeNewsSavedRequest(value);
      const data = marketResearchStore.setNewsSaved(request.newsId, request.isSaved);
      logger.info('Saved news state changed', {
        newsId: request.newsId,
        isSaved: request.isSaved,
      });
      return data;
    } catch (error) {
      logger.error('Unable to change saved news state', error);
      throw publicResearchError(error, '뉴스 저장 상태를 변경하지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.getGameAtelierData, (event) => {
    assertTrustedSender(event, config);
    try {
      return gameAtelierStore.load();
    } catch (error) {
      logger.error('Unable to load Game Atelier data', error);
      throw publicGameAtelierError(error, 'Game Atelier 프로젝트를 불러오지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.getGameProjectWorkspace, (event, value: unknown) => {
    assertTrustedSender(event, config);
    try {
      const request = sanitizeGameProjectWorkspaceKeyRequest(value);
      return gameAtelierStore.getWorkspace(request.projectId);
    } catch (error) {
      logger.error('Unable to load Game Atelier project workspace', error);
      throw publicGameAtelierError(error, 'Game Atelier 제작 화면을 불러오지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.saveGameProject, (event, value: unknown) => {
    assertTrustedSender(event, config);
    try {
      const request = sanitizeGameProjectRequest(value);
      const data = gameAtelierStore.saveProject(request.project);
      logger.info('Game Atelier project saved', { projectId: request.project.id });
      return data;
    } catch (error) {
      logger.error('Unable to save Game Atelier project', error);
      throw publicGameAtelierError(error, 'Game Atelier 프로젝트를 저장하지 못했습니다.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.saveGameProjectWorkspace, (event, value: unknown) => {
    assertTrustedSender(event, config);
    try {
      const request = sanitizeGameProjectWorkspaceRequest(value);
      const data = gameAtelierStore.saveWorkspace(request.projectId, request.workspace);
      logger.info('Game Atelier project workspace saved', { projectId: request.projectId });
      return data;
    } catch (error) {
      logger.error('Unable to save Game Atelier project workspace', error);
      throw publicGameAtelierError(error, 'Game Atelier 제작 화면을 저장하지 못했습니다.');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.exportMarketResearchData,
    async (event): Promise<MarketResearchExportResult> => {
      assertTrustedSender(event, config);
      try {
        const result = await showSaveDialog(event, {
          title: 'The Cabinet 연구 데이터 내보내기',
          defaultPath: createExportFileName(),
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['createDirectory', 'showOverwriteConfirmation'],
        });
        if (result.canceled || !result.filePath) {
          return { status: 'cancelled' };
        }

        const data = marketResearchStore.load();
        writeFileSync(result.filePath, marketResearchStore.exportToJson(), {
          encoding: 'utf8',
          mode: 0o600,
        });
        const response: MarketResearchExportResult = {
          status: 'exported',
          investmentMemoCount: Object.keys(data.investmentMemos).length,
          savedNewsCount: data.savedNewsIds.length,
        };
        logger.info('Market research data exported', {
          investmentMemoCount: response.investmentMemoCount,
          savedNewsCount: response.savedNewsCount,
        });
        return response;
      } catch (error) {
        logger.error('Unable to export market research data', error);
        throw publicResearchError(error, '연구 데이터를 내보내지 못했습니다.');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.importMarketResearchData,
    async (event): Promise<MarketResearchImportResult> => {
      assertTrustedSender(event, config);
      try {
        const result = await showOpenDialog(event, {
          title: 'The Cabinet 연구 데이터 가져오기',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile'],
        });
        const filePath = result.filePaths[0];
        if (result.canceled || !filePath) {
          return { status: 'cancelled' };
        }

        const data = marketResearchStore.importFromJson(readResearchImportFile(filePath));
        const response: MarketResearchImportResult = {
          status: 'imported',
          data,
          investmentMemoCount: Object.keys(data.investmentMemos).length,
          savedNewsCount: data.savedNewsIds.length,
        };
        logger.info('Market research data imported', {
          investmentMemoCount: response.investmentMemoCount,
          savedNewsCount: response.savedNewsCount,
        });
        return response;
      } catch (error) {
        logger.warn('Rejected or failed market research data import', error);
        throw publicResearchError(error, '연구 데이터를 가져오지 못했습니다.');
      }
    },
  );
}
