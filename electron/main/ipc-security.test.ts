import { describe, expect, it } from 'vitest';
import type { EnvironmentConfig } from './environment';
import { isTrustedSender } from './ipc';

const productionConfig: EnvironmentConfig = {
  name: 'production',
  openDevTools: false,
  echoLogsToConsole: false,
};

describe('IPC sender URL boundary', () => {
  it('accepts only the packaged renderer entry document in production', () => {
    expect(
      isTrustedSender('cabinet://renderer/index.html', productionConfig),
    ).toBe(true);
    expect(
      isTrustedSender('cabinet://renderer/assets/index.js', productionConfig),
    ).toBe(false);
    expect(
      isTrustedSender('cabinet://external/index.html', productionConfig),
    ).toBe(false);
    expect(isTrustedSender('file:///C:/secret.html', productionConfig)).toBe(
      false,
    );
  });

  it('keeps development IPC limited to the configured Vite origin', () => {
    const developmentConfig: EnvironmentConfig = {
      name: 'development',
      rendererUrl: 'http://127.0.0.1:5173',
      openDevTools: true,
      echoLogsToConsole: true,
    };

    expect(
      isTrustedSender('http://127.0.0.1:5173/index.html', developmentConfig),
    ).toBe(true);
    expect(isTrustedSender('http://localhost:5173', developmentConfig)).toBe(
      false,
    );
  });
});
