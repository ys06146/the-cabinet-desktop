import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  build: {
    appId: string;
    productName: string;
    publish: Array<Record<string, unknown>>;
    win: {
      artifactName: string;
      target: Array<{ arch: string[]; target: string }>;
    };
    nsis: Record<string, unknown>;
  };
  scripts: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const workflow = readFileSync(
  new URL('../../.github/workflows/release-windows.yml', import.meta.url),
  'utf8',
);

describe('Stage 7 Windows packaging contract', () => {
  it('builds only the installable Windows x64 NSIS target', () => {
    expect(manifest.build.appId).toBe('com.thecabinet.desktop');
    expect(manifest.build.productName).toBe('The Cabinet');
    expect(manifest.build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }]);
    expect(manifest.build.win.artifactName).toBe(
      'The-Cabinet-Setup-${version}.${ext}',
    );
    expect(JSON.stringify(manifest.build.win)).not.toContain('portable');
  });

  it('keeps installation optional and user data outside the installed app', () => {
    expect(manifest.build.nsis).toMatchObject({
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: 'always',
      createStartMenuShortcut: true,
      shortcutName: 'The Cabinet',
      deleteAppDataOnUninstall: false,
    });
  });

  it('embeds public GitHub feed metadata without credentials', () => {
    expect(manifest.build.publish).toEqual([
      {
        provider: 'github',
        owner: 'ys06146',
        repo: 'the-cabinet-desktop',
        releaseType: 'release',
      },
    ]);
    const buildConfig = JSON.stringify(manifest.build);
    expect(buildConfig).not.toMatch(/(?:gh|github)[_-]?token|authorization|secret/i);
  });

  it('never publishes from the local packaging command and includes updater metadata in CI', () => {
    expect(manifest.scripts['dist:win']).toContain('--publish never');
    expect(workflow).toContain('release/latest.yml');
    expect(workflow).toContain('--publish never');
    expect(workflow).not.toContain('--publish always');
    expect(workflow).toContain('Upload artifacts to the verified draft ID');
    expect(workflow).toContain('--input $localFile.FullName');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
  });
});
