import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  build: {
    publish: Array<{
      owner?: string;
      provider?: string;
      releaseType?: string;
      repo?: string;
    }>;
    win: {
      artifactName: string;
      target: Array<{ arch: string[]; target: string }>;
    };
  };
}

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8').replace(
    /\r\n/g,
    '\n',
  );

const manifest = JSON.parse(readProjectFile('package.json')) as PackageManifest;
const ciWorkflow = readProjectFile('.github/workflows/ci.yml');
const releaseWorkflow = readProjectFile('.github/workflows/release-windows.yml');

const extractTopLevelBlock = (source: string, key: string) => {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === `${key}:`);
  if (start === -1) return '';
  const end = lines.findIndex(
    (line, index) => index > start && /^\S[^:]*:\s*$/.test(line),
  );
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
};

const simpleRunCommands = (source: string) =>
  [...source.matchAll(/^\s+-?\s*run:\s*([^|>].*)$/gm)].map((match) =>
    match[1].trim(),
  );

const extractReleaseStep = (name: string) => {
  const start = releaseWorkflow.indexOf('      - name: ' + name + '\n');
  if (start === -1) return '';
  const end = releaseWorkflow.indexOf('\n      - name: ', start + 1);
  return releaseWorkflow.slice(start, end === -1 ? undefined : end);
};

describe('Stage 8 GitHub Actions contract', () => {
  it('runs the non-publishing CI checks for main pushes and pull requests', () => {
    const triggers = extractTopLevelBlock(ciWorkflow, 'on');
    expect(triggers).toMatch(/push:\s*\n\s+branches:\s*\[main\]/);
    expect(triggers).toMatch(/pull_request:\s*\n\s+branches:\s*\[main\]/);
    expect(triggers).not.toMatch(/tags:|workflow_dispatch:/);
    expect(ciWorkflow).toContain('actions/checkout@v4');
    expect(ciWorkflow).toMatch(/checkout@v4[\s\S]*persist-credentials:\s*false/);
    expect(ciWorkflow).toContain('actions/setup-node@v4');
    expect(ciWorkflow).toMatch(/node-version:\s*['"]?lts\/\*['"]?/);
    expect(ciWorkflow).toMatch(/cache:\s*npm/);
    expect(simpleRunCommands(ciWorkflow)).toEqual([
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
    ]);
  });

  it('keeps CI read-only and free of credentials or release actions', () => {
    expect(ciWorkflow).toMatch(/permissions:\s*\n\s+contents:\s*read/);
    expect(ciWorkflow).not.toMatch(/contents:\s*write/);
    expect(ciWorkflow).not.toMatch(/GH_TOKEN|GITHUB_TOKEN/);
    expect(ciWorkflow).not.toMatch(
      /action-gh-release|electron-builder|upload-release-asset|--publish/,
    );
  });

  it('runs the Windows release only for semantic version tags with write access', () => {
    const triggers = extractTopLevelBlock(releaseWorkflow, 'on');
    const permissions = extractTopLevelBlock(releaseWorkflow, 'permissions');
    expect(triggers).toMatch(/push:\s*\n\s+tags:\s*\n\s+-\s*['"]v\*\.\*\.\*['"]/);
    expect(triggers).not.toMatch(/branches:|pull_request:|workflow_dispatch:/);
    expect(permissions).toMatch(/contents:\s*write/);
    expect(releaseWorkflow).toMatch(/runs-on:\s*windows-latest/);
    expect(releaseWorkflow).toContain('actions/checkout@v4');
    expect(releaseWorkflow).toMatch(
      /checkout@v4[\s\S]*persist-credentials:\s*false/,
    );
    expect(releaseWorkflow).toContain('actions/setup-node@v4');
    expect(releaseWorkflow).toMatch(/node-version:\s*['"]?lts\/\*['"]?/);
    expect(releaseWorkflow).toMatch(/cache:\s*npm/);
  });

  it('fails before packaging when the tag differs from the package version', () => {
    expect(releaseWorkflow).toMatch(/package\.json/);
    expect(releaseWorkflow).toMatch(
      /RELEASE_TAG:\s*\$\{\{\s*github\.ref_name\s*\}\}/,
    );
    expect(releaseWorkflow).toMatch(/expectedTag\s*=\s*"v\$packageVersion"/);
    expect(releaseWorkflow).toMatch(/RELEASE_TAG\s*-ne\s*\$expectedTag/);
    expect(releaseWorkflow).toMatch(/exit\s+1/i);
    const versionCheckPosition = releaseWorkflow.search(/package\.json/);
    const packagingPosition = releaseWorkflow.indexOf(
      'electron-builder --win --x64 --publish always',
    );
    expect(versionCheckPosition).toBeGreaterThan(-1);
    expect(packagingPosition).toBeGreaterThan(versionCheckPosition);
  });

  it('validates the project before explicitly publishing an x64 NSIS release', () => {
    const requiredCommands = [
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'electron-builder --win --x64 --publish always',
    ];
    let previousPosition = -1;
    for (const command of requiredCommands) {
      const position = releaseWorkflow.indexOf(command);
      expect(position, `${command} 명령이 필요합니다.`).toBeGreaterThan(
        previousPosition,
      );
      previousPosition = position;
    }
    expect(manifest.build.win.target).toEqual([
      { target: 'nsis', arch: ['x64'] },
    ]);
    expect(releaseWorkflow).toMatch(
      /GH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/,
    );
  });

  it('creates one stable draft before concurrent uploads and publishes only after verification', () => {
    const stages = [
      'run: npm run build',
      '- name: Prepare one draft Release',
      'electron-builder --win --x64 --publish always',
      '- name: Verify local release artifacts',
      '- name: Verify draft assets and publish Release',
      'gh release edit $env:RELEASE_TAG --repo $env:GITHUB_REPOSITORY --draft=false',
      '- name: Verify published Release',
    ];
    let previousPosition = -1;
    for (const stage of stages) {
      const position = releaseWorkflow.indexOf(stage);
      expect(position, stage).toBeGreaterThan(previousPosition);
      previousPosition = position;
    }

    expect(releaseWorkflow).toMatch(
      /concurrency:\s*\n\s+group:\s*release-windows-\$\{\{\s*github\.ref\s*\}\}\s*\n\s+cancel-in-progress:\s*false/,
    );
    const prepare = extractReleaseStep('Prepare one draft Release');
    expect(prepare).toContain('gh api --include $releasePath');
    expect(prepare).toContain('if (-not $statusMatch.Success)');
    expect(prepare).toContain('if ($status -eq 404)');
    expect(prepare).toContain(
      'elseif ($status -ne 200 -or $lookupExitCode -ne 0)',
    );
    expect(prepare.match(/gh @createArgs/g)).toHaveLength(1);
    expect(prepare).toContain("'--verify-tag', '--draft'");
    expect(prepare).toContain(
      'if (-not $release.draft -or $release.prerelease)',
    );
    expect(prepare).toContain('Published releases must not be overwritten.');
    expect(prepare).toContain('docs/releases/v$env:APP_VERSION.md');
    expect(prepare).toContain("'--notes-file', $notesPath");
    expect(prepare).toContain("'--generate-notes'");
    expect(prepare).not.toMatch(/--clobber|release delete|--draft=false/);
  });

  it('requires every uploaded asset to match the local file before publishing', () => {
    const verify = extractReleaseStep('Verify draft assets and publish Release');
    expect(verify).toContain(
      'RELEASE_ID: ${{ steps.draft.outputs.release_id }}',
    );
    expect(verify).toContain('releases/$env:RELEASE_ID');
    expect(verify).toContain(
      '-not $release.draft -or $release.prerelease -or $release.tag_name -ne $env:RELEASE_TAG',
    );
    for (const asset of [
      'The-Cabinet-Setup-$env:APP_VERSION.exe',
      'The-Cabinet-Setup-$env:APP_VERSION.exe.blockmap',
      'latest.yml',
    ]) {
      expect(verify).toContain(asset);
    }
    expect(verify).toContain(
      "$assets.Count -ne 1 -or $assets[0].state -ne 'uploaded'",
    );
    expect(verify).toContain(
      '$assets[0].size -ne $localFile.Length -or $localFile.Length -le 0',
    );
    expect(verify).toContain('Get-FileHash');
    expect(verify).toContain('-Algorithm SHA256');
    expect(verify).toContain('if ($assets[0].digest -ne $localDigest)');
    expect(verify.indexOf('--draft=false')).toBeGreaterThan(
      verify.indexOf('if ($assets[0].digest -ne $localDigest)'),
    );
    expect(verify).toContain(
      "if ($LASTEXITCODE -ne 0) { throw 'Could not publish the verified draft release.' }",
    );
  });

  it('publishes a non-draft GitHub release with every updater artifact', () => {
    expect(manifest.build.publish).toEqual([
      {
        provider: 'github',
        owner: 'ys06146',
        repo: 'the-cabinet-desktop',
        releaseType: 'release',
      },
    ]);
    expect(manifest.build.win.artifactName).toBe(
      'The-Cabinet-Setup-${version}.${ext}',
    );
    expect(releaseWorkflow).toContain(
      'release/The-Cabinet-Setup-$env:APP_VERSION.exe',
    );
    expect(releaseWorkflow).toContain(
      'release/The-Cabinet-Setup-$env:APP_VERSION.exe.blockmap',
    );
    expect(releaseWorkflow).toContain('release/latest.yml');
    expect(releaseWorkflow).toMatch(
      /\$release\.draft\s*-or\s*\$release\.prerelease/,
    );
    expect(releaseWorkflow).not.toMatch(
      /draft:\s*true|releaseType:\s*draft/i,
    );
  });
});
