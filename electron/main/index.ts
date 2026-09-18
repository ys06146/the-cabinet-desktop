import { app, BrowserWindow, dialog, screen } from 'electron';
import { resolve } from 'node:path';
import { getEnvironmentConfig, type EnvironmentConfig } from './environment';
import { registerIpcHandlers } from './ipc';
import { logger } from './logger';
import { GameAtelierStore } from './game-atelier-store';
import { MarketResearchStore } from './market-research-store';
import {
  getWindowMinimumSize,
  WindowStateStore,
} from './window-state';
import { WindowCloseGuard } from './window-close-guard';
import { initializeUpdateRuntime, type UpdateRuntime } from './update-runtime';
import {
  installRendererProtocol,
  PRODUCTION_RENDERER_URL,
  registerRendererSchemePrivileges,
} from './renderer-protocol';

registerRendererSchemePrivileges();
app.setName('The Cabinet');

let mainWindow: BrowserWindow | null = null;
let windowStateStore: WindowStateStore | null = null;
let updateRuntime: UpdateRuntime | null = null;

function installProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught main-process exception', error);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled main-process rejection', reason);
  });
}

async function createMainWindow(config: EnvironmentConfig): Promise<BrowserWindow> {
  windowStateStore ??= new WindowStateStore();
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const workAreas = [
    primaryDisplay.workArea,
    ...displays
      .filter((display) => display.id !== primaryDisplay.id)
      .map((display) => display.workArea),
  ];
  const placement = windowStateStore.load(workAreas);
  const placementDisplay =
    placement.x === undefined || placement.y === undefined
      ? primaryDisplay
      : screen.getDisplayMatching({
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
        });
  const minimumSize = getWindowMinimumSize(placementDisplay.workArea);
  const window = new BrowserWindow({
    title: 'The Cabinet',
    show: false,
    backgroundColor: '#171613',
    width: placement.width,
    height: placement.height,
    x: placement.x,
    y: placement.y,
    minWidth: minimumSize.width,
    minHeight: minimumSize.height,
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow = window;
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  window.setMenuBarVisibility(false);
  const updateMinimumSizeForDisplay = (): void => {
    const display = screen.getDisplayMatching(window.getBounds());
    const nextMinimum = getWindowMinimumSize(display.workArea);
    const [currentMinWidth, currentMinHeight] = window.getMinimumSize();
    if (currentMinWidth !== nextMinimum.width || currentMinHeight !== nextMinimum.height) {
      window.setMinimumSize(nextMinimum.width, nextMinimum.height);
    }
  };
  window.on('move', updateMinimumSizeForDisplay);
  windowStateStore.track(window);

  const closeGuard = new WindowCloseGuard({
    prepare: () => {
      if (!updateRuntime) {
        return Promise.reject(new Error('Data save runtime is not available'));
      }
      return updateRuntime.prepareForClose();
    },
    shouldBypass: () => updateRuntime?.isInstallationQuitReady() ?? false,
    onBlocked: (error) => {
      logger.error('Window close blocked because user data could not be saved', error);
      if (window.isDestroyed()) {
        return;
      }
      void dialog
        .showMessageBox(window, {
          type: 'error',
          title: 'The Cabinet 종료 보류',
          message: '작성 중인 내용을 저장하지 못해 앱을 종료하지 않았습니다.',
          detail: '저장 상태를 확인한 뒤 다시 종료해 주세요.',
          buttons: ['확인'],
          defaultId: 0,
          noLink: true,
        })
        .catch((dialogError: unknown) => {
          logger.error('Unable to show close-blocked dialog', dialogError);
        });
    },
  });
  window.on('close', (event) => {
    closeGuard.handle(event, {
      close: () => window.close(),
      isDestroyed: () => window.isDestroyed(),
    });
  });

  if (placement.isMaximized) {
    window.maximize();
  }

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    logger.warn('Blocked renderer request to open a new window', { url });
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    logger.warn('Blocked renderer navigation', { url });
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    logger.warn('Blocked webview attachment');
  });
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    logger.error('Renderer failed to load', { errorCode, errorDescription, validatedUrl });
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process terminated', details);
  });
  window.webContents.on('unresponsive', () => {
    logger.warn('Renderer became unresponsive');
  });
  window.webContents.on('console-message', (details) => {
    const { level, message, lineNumber, sourceId } = details;
    const context = { level, line: lineNumber, sourceId };
    if (level === 'error') {
      logger.error(`Renderer console: ${message}`, context);
    } else if (level === 'warning') {
      logger.warn(`Renderer console: ${message}`, context);
    } else {
      logger.debug(`Renderer console: ${message}`, context);
    }
  });

  if (config.rendererUrl) {
    await window.loadURL(config.rendererUrl);
  } else {
    await window.loadURL(PRODUCTION_RENDERER_URL);
  }

  if (config.openDevTools) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  if (process.argv.includes('--smoke-test')) {
    logger.info('Smoke test renderer load completed');
    setTimeout(() => app.quit(), 750);
  }

  return window;
}

async function bootstrap(): Promise<void> {
  const config = getEnvironmentConfig();
  logger.initialize(config);
  installProcessErrorHandlers();
  if (!config.rendererUrl) {
    installRendererProtocol(resolve(__dirname, '../../dist/renderer'));
  }
  const marketResearchStore = new MarketResearchStore({ userDataPath: app.getPath('userData') });
  const gameAtelierStore = new GameAtelierStore({ userDataPath: app.getPath('userData') });
  registerIpcHandlers(config, marketResearchStore, gameAtelierStore);
  updateRuntime = initializeUpdateRuntime(config, () => mainWindow);

  await createMainWindow(config);
  updateRuntime.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow(config);
    }
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(bootstrap).catch((error: unknown) => {
    logger.error('Application bootstrap failed', error);
    app.quit();
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app.once('will-quit', () => {
  updateRuntime?.dispose();
  updateRuntime = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
