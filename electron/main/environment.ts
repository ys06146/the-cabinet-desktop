import { app } from 'electron';
import type { AppEnvironmentName } from '../shared/ipc';

export interface EnvironmentConfig {
  name: AppEnvironmentName;
  rendererUrl?: string;
  openDevTools: boolean;
  echoLogsToConsole: boolean;
}

const DEVELOPMENT_RENDERER_URL = 'http://127.0.0.1:5173';

const environmentDefaults: Record<AppEnvironmentName, Omit<EnvironmentConfig, 'name'>> = {
  development: {
    rendererUrl: DEVELOPMENT_RENDERER_URL,
    openDevTools: true,
    echoLogsToConsole: true,
  },
  production: {
    openDevTools: false,
    echoLogsToConsole: false,
  },
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const name: AppEnvironmentName = app.isPackaged ? 'production' : 'development';
  const defaults = environmentDefaults[name];

  return {
    ...defaults,
    name,
    rendererUrl:
      name === 'development'
        ? process.env.VITE_DEV_SERVER_URL ?? defaults.rendererUrl
        : undefined,
  };
}
