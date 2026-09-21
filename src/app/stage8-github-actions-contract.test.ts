import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

interface DraftLookupFixture {
  before: unknown;
  after?: unknown;
  lookupExitCode?: number;
  rawResponse?: string;
}

interface DraftLookupResult {
  ok: boolean;
  error: string | null;
  calls: string[][];
  output: string;
}

function runDraftPreparation(fixture: DraftLookupFixture): DraftLookupResult {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'cabinet-release-contract-'));
  try {
    const fixturePath = join(temporaryRoot, 'fixture.json');
    const scriptPath = join(temporaryRoot, 'prepare.ps1');
    const outputPath = join(temporaryRoot, 'output.txt');
    writeFileSync(fixturePath, JSON.stringify(fixture), 'utf8');
    const step = extractReleaseStep('Prepare one draft Release');
    const run = step.slice(step.indexOf('        run: |\n') + '        run: |\n'.length)
      .replace(/^ {10}/gm, '');
    const wrapper = [
      "$fixture = Get-Content -Raw -LiteralPath $env:CABINET_TEST_FIXTURE | ConvertFrom-Json",
      "$env:GITHUB_REPOSITORY = 'ys06146/the-cabinet-desktop'",
      "$env:RELEASE_TAG = 'v0.1.2'",
      "$env:APP_VERSION = '0.1.2'",
      '$env:GITHUB_OUTPUT = $env:CABINET_TEST_OUTPUT',
      '$script:created = $false',
      '$script:calls = [Collections.Generic.List[object]]::new()',
      'function gh {',
      '  $script:calls.Add([string[]]$args)',
      "  if ($args[0] -eq 'api' -and $args[1] -eq '--paginate' -and $args[2] -eq '--slurp') {",
      '    $global:LASTEXITCODE = [int]$fixture.lookupExitCode',
      '    if ($null -ne $fixture.rawResponse) { return [string]$fixture.rawResponse }',
      '    if ($script:created) { $pages = $fixture.after } else { $pages = $fixture.before }',
      '    return ConvertTo-Json -InputObject $pages -Depth 10 -Compress',
      '  }',
      "  if ($args[0] -eq 'release' -and $args[1] -eq 'create') {",
      "    if ($script:created) { throw 'Duplicate release creation attempted.' }",
      '    $script:created = $true',
      '    $global:LASTEXITCODE = 0',
      "    return 'https://github.com/ys06146/the-cabinet-desktop/releases/tag/untagged-draft'",
      '  }',
      "  throw ('Unexpected gh invocation: ' + ($args -join ' '))",
      '}',
      '$ok = $false',
      '$failure = $null',
      'try { & {',
      run,
      '}; $ok = $true } catch { $failure = $_.Exception.Message }',
      "$output = if (Test-Path -LiteralPath $env:GITHUB_OUTPUT) { Get-Content -Raw -LiteralPath $env:GITHUB_OUTPUT } else { '' }",
      "$result = @{ok=$ok; error=$failure; calls=@($script:calls.ToArray()); output=$output}",
      "Write-Output ('CABINET_RESULT=' + (ConvertTo-Json -InputObject $result -Depth 10 -Compress))",
    ].join('\n');
    writeFileSync(scriptPath, wrapper, 'utf8');
    const stdout = execFileSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', scriptPath], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, CABINET_TEST_FIXTURE: fixturePath, CABINET_TEST_OUTPUT: outputPath },
    });
    const result = stdout.split(/\r?\n/).find((line) => line.startsWith('CABINET_RESULT='));
    if (!result) throw new Error('Draft preparation did not produce a test result.');
    return JSON.parse(result.slice('CABINET_RESULT='.length)) as DraftLookupResult;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

interface UploadFixture {
  existing?: 'first-match' | 'all-match' | 'first-conflict' | 'first-duplicate' | 'first-incomplete';
  draft?: boolean;
  tag?: string;
  lookupExitCode?: number;
  publishOnLookup?: number;
  badUploadDigest?: boolean;
}

function runArtifactUpload(fixture: UploadFixture = {}): DraftLookupResult {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'cabinet-upload-contract-'));
  try {
    const names = ['The-Cabinet-Setup-0.1.2.exe', 'The-Cabinet-Setup-0.1.2.exe.blockmap', 'latest.yml'];
    mkdirSync(join(temporaryRoot, 'release'));
    const assets = names.map((name) => {
      const bytes = Buffer.from('test payload for ' + name);
      writeFileSync(join(temporaryRoot, 'release', name), bytes);
      return { name, size: bytes.length, state: 'uploaded', digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex') };
    });
    let existing = fixture.existing === 'all-match' ? assets : fixture.existing ? [assets[0]] : [];
    if (fixture.existing === 'first-conflict') existing = [{ ...assets[0], digest: 'sha256:wrong' }];
    if (fixture.existing === 'first-duplicate') existing = [assets[0], assets[0]];
    if (fixture.existing === 'first-incomplete') existing = [{ ...assets[0], state: 'starter' }];
    const fixturePath = join(temporaryRoot, 'fixture.json');
    const scriptPath = join(temporaryRoot, 'upload.ps1');
    writeFileSync(fixturePath, JSON.stringify({ ...fixture, assets, existing }), 'utf8');
    const step = extractReleaseStep('Upload artifacts to the verified draft ID');
    const run = step.slice(step.indexOf('        run: |\n') + '        run: |\n'.length)
      .replace(/^ {10}/gm, '');
    const wrapper = [
      "$fixture = Get-Content -Raw -LiteralPath $env:CABINET_TEST_FIXTURE | ConvertFrom-Json",
      "$env:GITHUB_REPOSITORY = 'ys06146/the-cabinet-desktop'",
      "$env:RELEASE_TAG = 'v0.1.2'",
      "$env:APP_VERSION = '0.1.2'",
      "$env:RELEASE_ID = '42'",
      '$script:assets = @($fixture.existing)',
      '$script:lookups = 0',
      '$script:calls = [Collections.Generic.List[object]]::new()',
      'function gh {',
      '  $script:calls.Add([string[]]$args)',
      "  if ($args[0] -eq 'api' -and $args[1] -eq '--method' -and $args[2] -eq 'POST') {",
      "    $inputIndex = [Array]::IndexOf([string[]]$args, '--input')",
      "    if ($inputIndex -lt 0 -or -not (Test-Path -LiteralPath $args[$inputIndex + 1])) { throw 'Missing upload file.' }",
      '    $name = [IO.Path]::GetFileName($args[$inputIndex + 1])',
      '    $expected = $fixture.assets | Where-Object { $_.name -eq $name }',
      "    if (-not $expected -or $args[3] -ne ('https://uploads.github.com/repos/ys06146/the-cabinet-desktop/releases/42/assets?name=' + $name)) { throw 'Wrong upload target.' }",
      '    $uploaded = @{name=$expected.name; size=$expected.size; state=$expected.state; digest=$expected.digest}',
      "    if ($fixture.badUploadDigest) { $uploaded.digest = 'sha256:incorrect' }",
      '    $script:assets += $uploaded',
      '    $global:LASTEXITCODE = 0',
      '    return ConvertTo-Json -InputObject $uploaded -Depth 10 -Compress',
      '  }',
      "  if ($args.Count -eq 2 -and $args[0] -eq 'api' -and $args[1] -eq 'repos/ys06146/the-cabinet-desktop/releases/42') {",
      '    $script:lookups += 1',
      '    $global:LASTEXITCODE = [int]$fixture.lookupExitCode',
      '    $draft = $fixture.draft -ne $false',
      '    if ($fixture.publishOnLookup -and $script:lookups -ge $fixture.publishOnLookup) { $draft = $false }',
      "    $tag = if ($fixture.tag) { $fixture.tag } else { 'v0.1.2' }",
      '    return ConvertTo-Json -InputObject @{id=42; draft=$draft; prerelease=$false; tag_name=$tag; assets=$script:assets} -Depth 10 -Compress',
      '  }',
      "  throw ('Unexpected gh invocation: ' + ($args -join ' '))",
      '}',
      '$ok = $false',
      '$failure = $null',
      'try { & {',
      run,
      '}; $ok = $true } catch { $failure = $_.Exception.Message }',
      "$result = @{ok=$ok; error=$failure; calls=@($script:calls.ToArray()); output=''}",
      "Write-Output ('CABINET_RESULT=' + (ConvertTo-Json -InputObject $result -Depth 10 -Compress))",
    ].join('\n');
    writeFileSync(scriptPath, wrapper, 'utf8');
    const stdout = execFileSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', scriptPath], {
      encoding: 'utf8',
      timeout: 15_000,
      cwd: temporaryRoot,
      env: { ...process.env, CABINET_TEST_FIXTURE: fixturePath },
    });
    const result = stdout.split(/\r?\n/).find((line) => line.startsWith('CABINET_RESULT='));
    if (!result) throw new Error('Artifact upload did not produce a test result.');
    return JSON.parse(result.slice('CABINET_RESULT='.length)) as DraftLookupResult;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

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
      'electron-builder --win --x64 --publish never',
    );
    expect(versionCheckPosition).toBeGreaterThan(-1);
    expect(packagingPosition).toBeGreaterThan(versionCheckPosition);
  });

  it('validates the project before packaging an x64 NSIS release without publisher credentials', () => {
    const requiredCommands = [
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'electron-builder --win --x64 --publish never',
    ];
    let previousPosition = -1;
    for (const command of requiredCommands) {
      const position = releaseWorkflow.indexOf(command);
      expect(position, `${command} 명령이 필요합니다.`).toBeGreaterThan(
        previousPosition,
      );
      previousPosition = position;
    }
    const packaging = extractReleaseStep('Package Windows x64 update without publishing');
    expect(packaging).not.toMatch(/GH_TOKEN|GITHUB_TOKEN/);
    expect(releaseWorkflow).not.toContain('--publish always');
    expect(manifest.build.win.target).toEqual([
      { target: 'nsis', arch: ['x64'] },
    ]);
    expect(releaseWorkflow).toMatch(
      /GH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/,
    );
  });

  it('prepares one draft, packages without publishing, and verifies sequential uploads before publication', () => {
    const stages = [
      'run: npm run build',
      '- name: Prepare one draft Release',
      'electron-builder --win --x64 --publish never',
      '- name: Verify local release artifacts',
      '- name: Upload artifacts to the verified draft ID',
      '- name: Verify draft assets and publish Release',
      'gh api --method PATCH "repos/$env:GITHUB_REPOSITORY/releases/$env:RELEASE_ID" -F draft=false',
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
    expect(prepare).toContain('gh api --paginate --slurp');
    expect(prepare).not.toContain('releases/tags/');
    expect(prepare).toContain('if ($tagReleases.Count -gt 1)');
    expect(prepare).toContain('if ($tagReleases.Count -eq 0)');
    expect(prepare).toContain('if ($tagReleases.Count -ne 1)');
    expect(prepare.match(/gh @createArgs/g)).toHaveLength(1);
    expect(prepare).toContain("'--verify-tag', '--draft'");
    expect(prepare).toContain(
      'if ($release.draft -ne $true -or $release.prerelease -ne $false)',
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
    expect(verify).not.toContain('releases/tags/');
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
    expect(verify.indexOf('-F draft=false')).toBeGreaterThan(
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

describe.skipIf(process.platform !== 'win32')('draft release resolution execution', () => {
  const draft = { id: 42, tag_name: 'v0.1.2', draft: true, prerelease: false };
  const createCalls = (result: DraftLookupResult) =>
    result.calls.filter((call) => call[0] === 'release' && call[1] === 'create');

  it('reuses a matching draft on a later page without creating another release', () => {
    const result = runDraftPreparation({
      before: [[{ ...draft, id: 1, tag_name: 'v0.1.1', draft: false }], [draft]],
    });
    expect(result.ok, result.error ?? '').toBe(true);
    expect(result.output.trim()).toBe('release_id=42');
    expect(createCalls(result)).toHaveLength(0);
    expect(result.calls).toHaveLength(1);
  });

  it('creates once when all pages lack the tag and resolves the new draft through the list', () => {
    const result = runDraftPreparation({ before: [[]], after: [[draft]] });
    expect(result.ok, result.error ?? '').toBe(true);
    expect(result.output.trim()).toBe('release_id=42');
    expect(createCalls(result)).toHaveLength(1);
    expect(result.calls.filter((call) => call[0] === 'api')).toHaveLength(2);
  });

  it.each([
    [{ ...draft, draft: false }],
    [{ ...draft, prerelease: true }],
    [draft, { ...draft, id: 43 }],
    [{ ...draft, id: null }],
  ])('fails closed before uploads for an unsafe existing target: %j', (...releases) => {
    const result = runDraftPreparation({ before: [releases] });
    expect(result.ok).toBe(false);
    expect(result.output).toBe('');
    expect(createCalls(result)).toHaveLength(0);
  });

  it.each([
    { before: [[]], lookupExitCode: 1, rawResponse: '{"message":"rate limit exceeded"}' },
    { before: [[]], rawResponse: '{broken json' },
    { before: { message: 'unexpected response' } },
    { before: [{ message: 'unexpected page' }] },
  ])('never treats a failed or malformed API response as permission to create: %j', (fixture) => {
    const result = runDraftPreparation(fixture);
    expect(result.ok).toBe(false);
    expect(result.output).toBe('');
    expect(createCalls(result)).toHaveLength(0);
  });

  it('fails without retrying creation when the post-create list still lacks the target', () => {
    const result = runDraftPreparation({ before: [[]], after: [[]] });
    expect(result.ok).toBe(false);
    expect(result.output).toBe('');
    expect(createCalls(result)).toHaveLength(1);
  });
});

describe.skipIf(process.platform !== 'win32')('numeric draft artifact upload execution', () => {
  const uploadCalls = (result: DraftLookupResult) =>
    result.calls.filter((call) => call[0] === 'api' && call[2] === 'POST');

  it('uploads all three files in sequence with a fresh numeric-ID draft check before each file', () => {
    const result = runArtifactUpload();
    expect(result.ok, result.error ?? '').toBe(true);
    expect(result.calls.map((call) => call[2] === 'POST' ? 'upload' : 'check'))
      .toEqual(['check', 'upload', 'check', 'upload', 'check', 'upload']);
    expect(uploadCalls(result).map((call) => new URL(call[3]).searchParams.get('name')))
      .toEqual(['The-Cabinet-Setup-0.1.2.exe', 'The-Cabinet-Setup-0.1.2.exe.blockmap', 'latest.yml']);
    expect(result.calls.some((call) => call.includes('DELETE') || call.includes('PATCH'))).toBe(false);
  });

  it('resumes without overwriting a verified matching asset', () => {
    const result = runArtifactUpload({ existing: 'first-match' });
    expect(result.ok, result.error ?? '').toBe(true);
    expect(uploadCalls(result).map((call) => new URL(call[3]).searchParams.get('name')))
      .toEqual(['The-Cabinet-Setup-0.1.2.exe.blockmap', 'latest.yml']);
  });

  it('does no uploading when all three existing assets match the local files', () => {
    const result = runArtifactUpload({ existing: 'all-match' });
    expect(result.ok, result.error ?? '').toBe(true);
    expect(uploadCalls(result)).toHaveLength(0);
    expect(result.calls).toHaveLength(3);
  });

  it.each<UploadFixture>([
    { existing: 'first-conflict' },
    { existing: 'first-duplicate' },
    { existing: 'first-incomplete' },
    { draft: false },
    { tag: 'v9.9.9' },
    { lookupExitCode: 1 },
  ])('rejects unsafe state before uploading any files: %j', (fixture) => {
    const result = runArtifactUpload(fixture);
    expect(result.ok).toBe(false);
    expect(uploadCalls(result)).toHaveLength(0);
  });

  it('stops before the next file if the draft becomes public between uploads', () => {
    const result = runArtifactUpload({ publishOnLookup: 2 });
    expect(result.ok).toBe(false);
    expect(uploadCalls(result)).toHaveLength(1);
    expect(result.calls).toHaveLength(3);
  });

  it('stops after an uploaded asset fails checksum verification', () => {
    const result = runArtifactUpload({ badUploadDigest: true });
    expect(result.ok).toBe(false);
    expect(uploadCalls(result)).toHaveLength(1);
    expect(result.calls).toHaveLength(2);
  });
});
