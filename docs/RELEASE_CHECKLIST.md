# The Cabinet Release Checklist

Use this checklist for an intentional public Windows x64 release. It describes the current NSIS and GitHub Actions flow; it does not authorize creating a tag or publishing a Release.

## 1. Release scope and version

- [ ] Confirm the release contents and known limitations are approved.
- [ ] Choose a new SemVer that is greater than every published version.
- [ ] Confirm the intended version is not already used by a Git tag or GitHub Release.
- [ ] Update both version files with `npm version X.Y.Z --no-git-tag-version`.
- [ ] Confirm `package.json` and the root package entries in `package-lock.json` contain `X.Y.Z`.
- [ ] Confirm the planned tag is exactly `vX.Y.Z`.
- [ ] Confirm no token, private key, certificate password, or credential was added to tracked files.

## 2. Clean validation

Run with the current Node.js LTS from a clean Windows x64 checkout on a local NTFS volume:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dist:win
```

- [ ] Dependency installation completed without lockfile changes.
- [ ] ESLint passed.
- [ ] TypeScript passed.
- [ ] All Vitest tests passed.
- [ ] Production Renderer, Main, and Preload builds passed.
- [ ] Local NSIS packaging passed without publishing.
- [ ] Record the test count and any expected warnings in the release notes.

## 3. Local package inspection

Expected local files:

```text
release/The-Cabinet-Setup-X.Y.Z.exe
release/The-Cabinet-Setup-X.Y.Z.exe.blockmap
release/latest.yml
release/win-unpacked/
```

- [ ] The Setup filename exactly matches the package version.
- [ ] The matching EXE blockmap exists.
- [ ] `latest.yml` exists and names the same Setup EXE and version.
- [ ] `release/win-unpacked/` contains the packaged application.
- [ ] No portable EXE or portable target was generated.
- [ ] No publish operation or GitHub Release occurred during `npm run dist:win`.
- [ ] Record the Setup SHA-256 for internal verification:

```powershell
Get-FileHash "release\The-Cabinet-Setup-X.Y.Z.exe" -Algorithm SHA256
```

## 4. Installer smoke test

Test on a Windows x64 account that does not contain development dependencies:

- [ ] The assisted installer opens and permits installation-directory selection.
- [ ] The desktop shortcut is created.
- [ ] The Start Menu shortcut is created.
- [ ] The installed application starts without a console or Renderer error.
- [ ] Settings and the sidebar display `vX.Y.Z`.
- [ ] Market Room, Game Atelier, Scene, Scripts, Tasks, and Preview still open.
- [ ] A memo and Game Project edit survive app exit and relaunch.
- [ ] Installing over an older version preserves user data and window state.
- [ ] Application files and Electron `userData` remain separate.
- [ ] The current unsigned-build warning, if shown, matches the documented release limitation; no unexpected security prompt appears.

## 5. Commit and tag review

Before creating the tag:

- [ ] `git status` contains only the intended release changes.
- [ ] The release commit contains the matching `package.json` and `package-lock.json` versions.
- [ ] All required documentation and release notes are committed.
- [ ] The commit is present on `main`.
- [ ] Create one annotated tag at that exact commit: `git tag -a vX.Y.Z -m "The Cabinet vX.Y.Z"`.
- [ ] Push `main`, then explicitly push `vX.Y.Z`.
- [ ] Do not move, replace, or reuse a published tag.

Only perform the last two actions after explicit release authorization.

## 6. GitHub Actions verification

- [ ] `.github/workflows/ci.yml` passed for the release commit on `main`.
- [ ] CI used read-only contents permission and ran checkout, Node.js LTS setup with npm cache, `npm ci`, lint, typecheck, tests, and the production build.
- [ ] CI did not run electron-builder publishing or receive a GitHub publishing token.
- [ ] The `Release Windows` run is associated with `refs/tags/vX.Y.Z`.
- [ ] The release workflow rejected no version mismatch and repeated the complete quality gate.
- [ ] `Package and publish Windows x64 update` ran exactly once with explicit `--publish always`.
- [ ] The release workflow verified the local Setup EXE, EXE blockmap, `latest.yml`, and unpacked build.
- [ ] No branch or pull-request workflow published a Release.

## 7. GitHub Release verification

- [ ] The Release belongs to public repository `ys06146/the-cabinet-desktop`.
- [ ] Its tag is `vX.Y.Z` and points to the reviewed release commit.
- [ ] It is a normal published release, not a draft or prerelease.
- [ ] It contains `The-Cabinet-Setup-X.Y.Z.exe`.
- [ ] It contains `The-Cabinet-Setup-X.Y.Z.exe.blockmap`.
- [ ] It contains `latest.yml`.
- [ ] `latest.yml` reports version `X.Y.Z` and references the exact uploaded Setup asset.
- [ ] The metadata size and checksum correspond to the immutable uploaded asset.
- [ ] No credential, debug archive, portable build, or unrelated file is attached.

Do not replace an EXE after publishing its `latest.yml`; publish a higher patch version instead.

## 8. Automatic update acceptance test

Use a real installed lower public version. Development mode intentionally does not initialize the updater.

- [ ] Launch the lower version and confirm its current version.
- [ ] Wait at least 15 seconds or select **Settings → 업데이트 확인**.
- [ ] The new `X.Y.Z` version is reported as available.
- [ ] The update does not download automatically.
- [ ] Explicit download shows progress and reaches download complete.
- [ ] Selecting **나중에** leaves the application running.
- [ ] Cancelling the native restart confirmation leaves the application running.
- [ ] Approving restart first saves dirty investment memos.
- [ ] Approving restart first saves the current generated Game Project and pending workspace edits.
- [ ] Approving restart first saves unfinished Game Atelier idea, answer, and conversation turn.
- [ ] A save failure or timeout blocks installation and does not close the app; verify this with the automated regression rather than destructive production-data manipulation.
- [ ] Successful approval closes the app only after the save barrier passes.
- [ ] The NSIS update completes and relaunches the application.
- [ ] Settings and the sidebar display `vX.Y.Z`.
- [ ] Memos, projects, workspaces, unfinished input, and window state are preserved.
- [ ] A subsequent check reports no newer version.
- [ ] No updater object, generic IPC primitive, `window.require`, or `window.process` is exposed to the Renderer.

## 9. Completion and incident response

- [ ] Record the workflow URL, Release URL, Setup SHA-256, test totals, and acceptance-test result.
- [ ] Record the absence or presence of code signing and the expected Windows warning.
- [ ] Keep release assets immutable after validation.
- [ ] If a defect is found, stop promoting the affected installer and prepare a higher patch version.
- [ ] Never repair a released version by force-moving its tag or silently replacing checksum-bound assets.


## 10. Stage 9 mandatory release gates

- [ ] Confirm `https://github.com/ys06146/the-cabinet-desktop` is readable without authentication and is the repository running the workflow.
- [ ] Confirm the release checkout has `.git`, the intended origin, and a clean reviewed release commit.
- [ ] Configure a code-signing certificate through GitHub Secrets only; do not commit the certificate or password.
- [ ] Make the Release build fail if Setup EXE or app EXE is unsigned.
- [ ] Verify `Get-AuthenticodeSignature` returns `Valid` and the signer subject equals the approved publisher.
- [ ] Verify packaged `app-update.yml` contains the expected `publisherName` when publisher verification is enabled.
- [ ] Run `npx @electron/fuses read --app "release\win-unpacked\The Cabinet.exe"` and compare every fuse with the approved baseline.
- [ ] Verify the packaged entry URL is `cabinet://renderer/index.html`, Renderer Node globals are unavailable, and traversal/foreign-host requests are denied.
- [ ] Run `npm audit --omit=dev` and the full audit. Re-evaluate the documented brace-expansion maintenance-backport exception against the current advisory data.
- [ ] Test the actual NSIS installer at 100%, 125%, and 150% scaling, with a Korean Windows account and `C:\앱 테스트\The Cabinet` installation path.
- [ ] Complete every success and failure scenario in `docs/UPDATE_VERIFICATION.md` from disposable VM snapshots.
- [ ] Inject an installation failure after the old version removal point and prove the approved rollback or recovery procedure.
- [ ] Confirm Market Research JSON native export/import uses a Korean path. Do not claim Game Project JSON support.
- [ ] Record unresolved Medium/Low issues from `docs/RELEASE_READINESS.md` in the Release notes or approved risk register.

## 11. Unsigned build warning

The current local build is unsigned and is not approved for public distribution. Until signing is configured, expect SmartScreen or “unknown publisher” warnings and possible organizational policy blocks. HTTPS and updater SHA-512 metadata do not authenticate the software publisher.
