# Project State

Last updated: 2026-09-18

## Current stage

Stage 9 implementation is now being continued in the public `ys06146/the-cabinet-desktop` source repository. The user authorized public source upload and a visible automatic-update button on 2026-09-18. The user subsequently authorized publishing v0.1.1. This initial public release is unsigned; real installed-update and failure-recovery acceptance remain unverified.

The Stage 9 verification evidence below is historical (2026-07-31), not a claim that those packaging checks were repeated for every later change.

## Implemented foundation

- Electron Main, sandboxed Preload, and React Renderer remain separate build entry points.
- Development loads the local Vite server; production serves bundled Renderer assets only through the path-limited `cabinet://renderer` protocol.
- Browser window defaults to 1440×900 with a minimum of 1100×700 and restores normal bounds and maximized state.
- `contextIsolation` and the Chromium sandbox are enabled; Node integration is disabled.
- Renderer Content Security Policy is environment-specific: local Vite connections are allowed only in development, while production uses `connect-src 'self'`.
- IPC exposes named runtime, error-reporting, Market Room persistence, and narrow Game Atelier project/workspace operations only. Main verifies the top-level sender and exact packaged Renderer path.
- Windows x64 NSIS packaging and GitHub Actions build/tag-release automation remain configured.
- `electron-updater` uses a public GitHub feed configuration for `ys06146/the-cabinet-desktop`; no token or credential is embedded in application code.

## Implemented in Stage 2

- Required semantic colors are CSS variables: background, surface, elevated surface, text, muted text, border, accent, positive, negative, and warning.
- Brass, title/body/mono fonts, 8–12px radii, focus ring, reduced-motion, and restrained overlay shadow tokens are defined.
- Desktop shell contains a collapsible sidebar; narrow layouts use an off-canvas navigation dialog and support widths from 320px.
- Sidebar, top bar, current version, active navigation, search placeholder, Mock Data status, update placeholder, and local Assistant placeholder remain implemented.
- Shared LoadingSkeleton, ErrorMessage, and EmptyState components remain available.
- Stage 2 introduced a presentation-only Game Atelier placeholder; Stage 5 replaces it with the planning flow below.

## Implemented in Stage 3

- `MarketDataProvider` and `MockMarketDataProvider` provide eight market summary items, five domestic and six US watchlist stocks, quotes, and deterministic OHLCV data.
- The SVG chart supports five ranges, candles, volume, SMA 5/20/60, RSI 14, MACD, Signal, Histogram, crosshair, zoom, pan, reset, pointer controls, and keyboard controls.
- Pure indicator functions and deterministic rule-based analysis cover trend, momentum, moving averages, volume, RSI, support, resistance, scenarios, risks, and rule confidence.
- Stage 3 selection, async loading, stale-response protection, retry, accessibility, and the research disclaimer remain intact.

## Implemented in Stage 4

- `NewsProvider` and `MockNewsProvider` expose 12 completely fictional stories through the seven filters: all, domestic, US, company, industry, economy, and policy.
- News cards show a fictional outlet, time, related symbols and canonical themes, importance, sentiment, two-line summary, Mock source, and persisted saved state.
- The right-side native dialog Drawer shows summary, direct impact, indirect impact, counter-perspective, and unconfirmed points, then restores focus to its trigger.
- `ThemeProvider` and `MockThemeProvider` expose the exact ten requested themes with descriptions, domestic and US stocks, catalysts, risks, interest, momentum, and fixture-derived news counts.
- Theme relations use only core company, supply-chain company, and indirect-beneficiary company levels.
- Market Room now has keyboard-operable research, news, theme, and memo tabs while preserving the Stage 3 desk.
- Each watchlist symbol has a controlled investment memo containing all seven requested fields. The invalidation condition is the first and strongest visual section.
- News/theme UI imports application services and provider contracts rather than concrete mock implementations.
- Mock news/theme providers support optional asynchronous latency and failure simulation.

## Implemented in Stage 5

- Game Atelier starts with the requested central prompt, five idea templates, and four examples.
- `LLMProvider` and `MockLLMProvider` run an asynchronous rules-based conversation without an external LLM or network call.
- The five required questions advance in order with exactly one current question; prior turns remain visible as chat history.
- A completed conversation creates a strict `GameProject` containing every requested Overview and Game Design field.
- `Midnight Archive` is provided as a complete built-in Mock fixture and is not duplicated into user data.
- Generated projects are automatically saved, shown on the local project shelf only after persistence succeeds, and remain visible with retry controls if saving fails.
- Mock AI is explicitly identified on the start, conversation, project, and footer surfaces.
- Keyboard focus advances to each new answer field, current questions are associated with their inputs, and long user text wraps at 320px.

## Implemented in Stage 6

- Game Projects expose keyboard-operable Overview, Game Design, Scene, Scripts, Assets, Tasks, and Preview tabs.
- Scene uses a responsive 960×540 Canvas with the seven requested default objects, select/move/resize/delete tools, grid, run, pointer dragging, keyboard movement, and a controlled Inspector.
- Unity-specific labels include plain Korean explanations for Scene, GameObject, Inspector, Rigidbody2D, Collider2D, Gravity Scale, Prefab, Tag, and trigger callbacks.
- Scripts and Assets expose a virtual Unity draft tree containing `MainScene.unity`, the three requested C# examples, and an empty `Prefabs/` location without filesystem or Unity API access.
- The rules-based Mock code modifier supports speed, jump, and ten-item completion requests, persists one targeted script revision per request, and explains safe values, risks, connected objects, and common errors.
- Tasks persist status, difficulty, implementation order, related Scene, related Script, and completion state.
- Preview is explicitly a browser Canvas prototype rather than Unity output. It supports WASD/arrows, collision, scoring, collect-all completion, pause/resume, deterministic restart, sound toggle, score display, and keyboard focus.
- Preview runtime state remains mounted across project-tab changes while its animation loop stops off-tab. A new application session intentionally starts a fresh Preview run.

## Implemented in Stage 7

- Windows distribution remains x64 NSIS-only. The assisted installer allows installation-directory selection and creates desktop and Start Menu shortcuts; no portable target exists.
- The Setup artifact is named `The-Cabinet-Setup-${version}.exe`. Local packaging always uses `--publish never`, while tagged GitHub Actions releases upload the Setup EXE, blockmap, and `latest.yml`.
- Packaged applications schedule an update check 15 seconds after startup. Development never configures, schedules, or invokes the updater.
- Main owns `electron-updater`, disables automatic download and install-on-quit, and exposes only get/check/download/install commands plus read-only state notifications through Preload.
- The tested state machine covers idle, checking, up-to-date, available, downloading, downloaded, and understandable error states, including stale and out-of-order event rejection.
- Settings shows the current version, manual check, availability, download progress, explicit restart choice, and actionable errors. The top bar mirrors the current update status.
- Installation begins only after a native restart confirmation and a Renderer save barrier. Current generated Game Projects, pending workspaces, all dirty investment memos, and unfinished Game Atelier input must save successfully first.
- Failed, timed-out, or stale save preparation blocks installation without closing the app. A downloaded update never installs automatically or on an ordinary app quit.
- Unfinished Game Atelier input is stored in Chromium user data with a bounded v1 draft contract and is restored ahead of the last-opened project after an update restart.
## Implemented in Stage 8

- `.github/workflows/ci.yml` runs on `main` pushes and pull requests with read-only contents permission.
- CI uses the current Node.js LTS with npm caching, then runs `npm ci`, lint, typecheck, tests, and the production build without packaging or publishing a Release.
- `.github/workflows/release-windows.yml` runs only for `v*.*.*` tag pushes on `windows-latest` with `contents: write`.
- Release validation requires the tag to equal `v` plus the exact stable SemVer in `package.json`; mismatches fail before dependency installation or packaging.
- The release workflow repeats the complete quality gate and explicitly invokes `electron-builder --win --x64 --publish always`.
- `GH_TOKEN` is supplied only to publishing and verification steps through `secrets.GITHUB_TOKEN`; no credential is committed or embedded in the application.
- `releaseType: release` prevents draft publication, and a post-publish GitHub API check rejects draft, prerelease, or missing Setup EXE, blockmap, and `latest.yml` assets.
- The obsolete combined `windows.yml` workflow was removed to prevent duplicate CI and release execution.
- README release instructions and `docs/RELEASE_CHECKLIST.md` document versioning, tag creation, release verification, and installed-app update acceptance testing.

## Persistence and data transfer

- `market-research-data.json` is stored under Electron's `userData` directory, outside the application bundle. NSIS keeps app data during uninstall/update replacement.
- The current file contract is pinned to `dataVersion: 1`; v0 array-shaped memos migrate to v1 through an explicit one-version-at-a-time migration registry.
- The store validates exact fields, safe IDs and symbols, real `YYYY-MM-DD` dates, record counts, character limits, decoded JSON, future versions, and UTF-8 byte limits before mutation.
- Writes use a same-directory temporary file, `fsync`, and rename. Synchronous Main mutations complete before IPC resolves.
- JSON export/import runs only through Main-owned native dialogs; Renderer receives neither filesystem APIs nor file paths.
- Import validates before writing, unions saved-news IDs, adds new memos, and preserves an existing memo when the same symbol conflicts.
- Import/export is disabled while any unsaved memo draft exists, preventing visible edits from being omitted or overwritten.
- `game-atelier-data.json` is a separate pinned `dataVersion: 2` document containing generated projects, project workspaces, and `lastOpenedProjectId`.
- An explicit v1→v2 migration preserves existing projects and adds an empty `projectWorkspaces` map without changing the `GameProject` schema.
- Game Project/workspace storage applies strict field, identifier, date, Scene-bound, script, task, project-count, character, byte, and version validation before mutation.
- Game Project writes use the same userData-owned temporary file, `fsync`, and rename pattern; the built-in fixture remains application data.

## Verification

- ESLint: passed.
- TypeScript: passed.
- Vitest: 47 files, 213 tests passed.
- Both GitHub Actions YAML files parsed successfully with a YAML parser.
- Stage 8 workflow contracts verify triggers, permissions, Node/npm caching, command order, tag/version rejection, token scoping, explicit publishing, non-draft state, and required updater assets.
- The tag/version PowerShell comparison passed for `v0.1.0` and rejected a mismatched `v0.1.1` without creating a tag or Release.
- Local `npm run dist:win` passed with `--publish never` and generated the x64 NSIS Setup EXE, blockmap, `latest.yml`, and unpacked build without creating a tag or Release.
- An isolated packaged-app smoke run started and closed all Electron processes cleanly; three runtime log files contained zero error entries.
- Production build: Renderer, Main, and Preload passed.
- Windows x64 NSIS packaging: passed; Setup EXE, `latest.yml`, blockmap, embedded `app-update.yml`, and unpacked build were generated without publishing.
- Store restart test: a new store instance restored the saved memo and saved-news ID from the same isolated directory.
- Packaged restart QA: the app saved a memo and news through UI → Preload → IPC → `userData`, exited, relaunched with the same isolated `userData`, and restored both in UI and through the bridge.
- Responsive packaged QA: 320×900 research surfaces, right Drawer, themes, and memo rendered without horizontal overflow.
- Packaged Renderer QA reported no runtime exceptions or console errors.
- UTF-8 limit regression: the maximum allowed Korean memo export remains importable under the separate byte limit.
- Game Atelier Store restart test: a new Store instance restored a generated project and its last-opened ID from the same isolated directory.
- Packaged Game Atelier QA: five sequential answers generated and saved `The Book Collector`, the app exited, and a new packaged process restored the project through both UI and the Preload bridge.
- Packaged Game Atelier responsive QA: the restored project rendered at a 320px device width without horizontal overflow or Renderer console errors.
- Maximum-length ideation regression: 2,000-character idea and answer boundaries still create a valid bounded project summary.
- Game workspace migration/restart regression: v1 data migrates to v2, invalid workspaces are rejected, and a new Store instance restores Scene, Script, and Task state.
- Electron workbench QA: Scene speed/grid, C# revision, and Task completion persisted through Preload/IPC and restored after process exit and relaunch with `dataVersion: 2`.
- Playable Preview QA: first input rendered in 19.9ms, repeated restart retained one animation loop, pause movement was 0px, item scores advanced 1→6, and collect-all reached `complete`.
- Preview tab/resize QA: score and player position survived a Tasks round trip and 1100×700→1440×900 window changes while Canvas width responded from 419px to 759px.
- Stage 6 Renderer QA reported no runtime exceptions or console errors; Renderer Node globals remained unavailable.
- Stage 7 update regressions cover state transitions, stale events, packaged-only scheduling, manual download, install confirmation, persistence failure, timeout, IPC validation, and no-quit failure behavior.
- Stage 7 packaging produced `The-Cabinet-Setup-0.1.0.exe` (93,075,786 bytes), matching blockmap and `latest.yml`, an embedded public GitHub `app-update.yml`, and a complete unpacked application; no portable artifact was produced or published.
- Packaged Settings QA showed v0.1.0, the update-check control, and live top-bar status with zero Renderer exceptions or console errors. `window.require` and `window.process` remained unavailable and the bridge exposed no generic IPC method.

## Not implemented

- Live market data, real news, LLM, Unity, login, server, database, investment ordering, or external URL opening.
- Editable watchlist membership, Saved Items/Notes sidebar aggregation, reminder notifications, or calendar integration.
- Real Unity project generation/export, Unity API integration, binary asset editing, project deletion/export, or real AI generation.
- Search execution, non-update settings, or Assistant messaging.
- A real Git tag or GitHub Release publication, custom update channels, background download, or unattended update installation.
- Light mode.
- Custom Windows icon and release code-signing certificate.

## Implemented in Stage 9

- Electron was upgraded to 43.2.0 and production fuses disable RunAsNode, Node options, and CLI inspect while enabling cookie encryption, ASAR integrity validation, and app-asar-only loading.
- A restricted `cabinet://renderer` protocol serves only the packaged Renderer root. Foreign hosts, malformed paths, and path traversal are rejected; IPC trusts only the exact production entry document.
- Browser permission checks and requests default to deny. GitHub checkout no longer persists credentials in either workflow.
- Ordinary window close now shares the Renderer save barrier used by update installation. A failed save keeps the app open and allows a later retry.
- Save tasks that fail while a feature unmounts retain their captured payload for the next flush.
- Game Project switching clears stale workspace state and prevents a previous project's delayed data from being saved under the new project ID.
- Window defaults and restored bounds clamp to the current display work area when Windows scaling leaves less than the configured 1100×700 minimum.
- The dependency lock uses minimatch-major-compatible brace-expansion maintenance backports instead of an incompatible global override.
- Korean document language metadata, clean ESLint 10 configuration, custom protocol path tests, IPC URL boundary tests, close-guard tests, save-retry tests, and high-DPI window tests were added.

## Stage 9 packaged-flow verification

- Market Room entry, stock changes, chart range changes, fictional news save, Korean NVDA memo save, close, restart, and restoration passed.
- Five sequential Mock AI answers created and persisted `Rainwalk Seoul`; restart restored the project.
- Preview start, keyboard focus, input, and project-tab state restoration passed.
- Native Market Research JSON export and import/merge passed. Game Project JSON export/import is not an implemented feature.
- A 320px emulated viewport had no document overflow; the Preview Canvas scaled inside the viewport.
- Packaged smoke passed with Korean and spaces in the install-like path and userData path.
- Provider forced-failure, latency, invalid JSON, storage restart, updater failure, IPC validation, Canvas cleanup, and event-listener cleanup remain covered by unit or code-level regression checks.
- Local Mock flows continued under DevTools network-offline emulation and real update-feed HTTP failure; a physical Windows network-adapter-off run remains a release-VM check.

## Release gate

- Public source repository `ys06146/the-cabinet-desktop` was created on 2026-09-18. A published installer release with matching update assets still needs to be prepared.
- This workspace now has a `main` Git branch and `origin` pointing to `https://github.com/ys06146/the-cabinet-desktop.git`. The v0.1.1 release tag is prepared from the reviewed main release commit.
- Setup and application executables are unsigned and updater publisher authentication is not configured.
- A destructive v0.1.0→v0.1.1 installer failure/rollback test has not been run on a disposable VM snapshot.
- See `docs/RELEASE_READINESS.md` and `docs/UPDATE_VERIFICATION.md` for severity, evidence, and the required acceptance procedure.

## Final Stage 9 evidence

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run dist:win` passed.
- Production dependency audit passed with 0 known vulnerabilities; the full development-tree audit reports 16 High findings that all trace to the brace-expansion advisory documented in `docs/RELEASE_READINESS.md`.
- The final NSIS Setup is 100,630,714 bytes. Setup, blockmap, and `latest.yml` hashes and metadata match, and no portable artifact was generated.
- The final packaged smoke run used Korean characters and spaces in the isolated userData path, loaded `cabinet://renderer/index.html`, exited cleanly, and logged 0 errors and 0 warnings.
- An actual silent NSIS first install to a custom Korean-and-space path created both shortcuts, the installed app smoke passed, uninstall removed the app and shortcuts, and the isolated userData remained intact.
- Setup SHA-256: `8EC5A647133A77D0E3CFA1A5888272847A32C2502F0039029AC397A97FCCB2AF`.
