import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  build: {
    electronFuses: Record<string, boolean>;
  };
  devDependencies: {
    electron: string;
  };
  overrides?: Record<string, unknown>;
}

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8').replace(
    /\r\n/g,
    '\n',
  );

const manifest = JSON.parse(readProjectFile('package.json')) as PackageManifest;

describe('Stage 9 release-readiness contract', () => {
  it('keeps the supported Electron line and production fuse hardening', () => {
    const electronMajor = Number.parseInt(
      manifest.devDependencies.electron.match(/\d+/)?.[0] ?? '0',
      10,
    );

    expect(electronMajor).toBeGreaterThanOrEqual(43);
    expect(manifest.build.electronFuses).toEqual({
      runAsNode: false,
      enableCookieEncryption: true,
      enableNodeOptionsEnvironmentVariable: false,
      enableNodeCliInspectArguments: false,
      enableEmbeddedAsarIntegrityValidation: true,
      onlyLoadAppFromAsar: true,
      grantFileProtocolExtraPrivileges: false,
    });
  });

  it('does not flatten incompatible brace-expansion majors', () => {
    expect(manifest.overrides?.['brace-expansion']).toBeUndefined();
  });

  it('denies optional Chromium permissions and protects ordinary window close', () => {
    const mainProcess = readProjectFile('electron/main/index.ts');

    expect(mainProcess).toContain('contextIsolation: true');
    expect(mainProcess).toContain('nodeIntegration: false');
    expect(mainProcess).toContain('sandbox: true');
    expect(mainProcess).toContain('setPermissionCheckHandler(() => false)');
    expect(mainProcess).toContain('setPermissionRequestHandler(');
    expect(mainProcess).toContain("window.on('close'");
    expect(mainProcess).toContain('new WindowCloseGuard');
  });
});
