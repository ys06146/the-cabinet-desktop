# Technical Decisions

## D-001 — Separate build entry points

Vite builds the Renderer to `dist/renderer` and bundles Electron Main and Preload independently to CommonJS files under `dist-electron`. This keeps the browser and desktop execution boundaries explicit while retaining one TypeScript toolchain.

## D-002 — Narrow desktop bridge

The Renderer receives no Node.js primitives and no generic IPC method. Preload exposes named functions backed by allowlisted channels, and Main validates the sender URL and error payload before acting.

## D-003 — User data survives application replacement

Mutable state belongs under Electron's `userData` path. Stage 1 applies this to window state. NSIS does not remove app data during uninstall, which also protects future user records across in-place updates.

## D-004 — Environment resolution belongs to Main

Main determines development versus production from `app.isPackaged`. Only development accepts a Vite URL and automatically opens DevTools. No secret-bearing configuration is exposed to the Renderer.

## D-005 — Provider contracts arrive with their domain

Stage 1 establishes the provider and mock-provider locations but does not invent market, news, or AI response schemas before their feature requirements exist. When introduced, UI components will depend on application services rather than concrete providers.

## D-006 — Updater activation is deferred

`electron-updater` is included because it is part of the fixed stack, but automatic checks are not enabled without a trusted release feed and release policy. This avoids unintended network access during the mock-only phase.

## D-007 — Windows release automation

GitHub Actions uses Node.js 22 on `windows-latest`, runs static checks and tests, creates the x64 NSIS installer, and publishes artifacts for tags beginning with `v`. Code signing remains a release-operations concern because no certificate is available in Stage 1.
## D-008 — Semantic design tokens are the single color source

Renderer colors, typography roles, radii, and the one overlay shadow are declared as CSS variables. Tailwind maps semantic names to those variables, so component code does not own literal palette values and no light theme branch exists.

## D-009 — Workspace navigation is additive to the room domain

`RoomId` continues to represent only Market Room and Game Atelier. `WorkspaceSectionId` adds Saved Items, Notes, and Settings for shell navigation without changing room definitions or requiring a data migration.

## D-010 — Responsive Renderer and native window limits are separate concerns

Electron retains the Stage 1 minimum window size of 1100×700. Renderer CSS no longer inherits that desktop minimum and supports 320px layouts for narrow previews and future surfaces. Below 768px, navigation uses a native modal dialog instead of a compressed permanent rail.

## D-011 — Placeholder controls do not imply connected services

Search accepts local input but executes no query, update status explicitly remains on standby, and Assistant opens an explanatory local dialog. These controls establish shell layout and accessibility without introducing external behavior ahead of scope.

## D-012 — Environment-specific Content Security Policy

Development CSP permits only the local Vite HTTP and WebSocket origins needed for hot reload. Production omits those origins and limits connections to the packaged application itself, so development allowances cannot ship in the installer.

## D-013 — Market data stays behind an application boundary

Market UI imports the Market Room application service and never imports the concrete mock provider. `MarketDataProvider` is intentionally limited to the four requested read operations, so a future provider can replace the mock without restructuring UI components.

## D-014 — Indicator formulas have explicit numerical contracts

SMA uses a rolling arithmetic mean, RSI 14 uses Wilder smoothing, and MACD uses SMA-seeded EMA 12/26 with a 9-period signal. Outputs remain aligned to OHLCV input with `null` warm-up values, and rounding occurs only at display boundaries.

## D-015 — The chart is dependency-free SVG

Candles, volume, moving averages, MACD, crosshair, zoom, and pan are rendered with React SVG and tested pure viewport geometry. This avoids a chart-library dependency while retaining keyboard and pointer access.

## D-016 — Analysis confidence is not forecast probability

Analysis is deterministic and rules-based. Confidence measures sample completeness, indicator availability, directionality, and rule agreement; it is explicitly described as distinct from forecast probability. Scenarios remain conditional and avoid directive trading language.

## D-017 — Stage 3 watchlist data is not user-owned state

The Stage 3 watchlist is a fixed mock-provider fixture. Editable watchlists and their versioned persistence under Electron `userData` remain deferred until explicitly scoped, so no premature storage schema or migration is introduced.

## D-018 — News and themes remain provider-backed reference data

`NewsProvider` and `ThemeProvider` own read contracts, while application services compose the concrete mock implementations. Persisted saved-news IDs are overlaid after provider reads, so a future real news source does not own personal state and UI does not depend on a mock class.

## D-019 — Mock reporting is deliberately fictional and canonically linked

Stage 4 news has no article URL or reproduced source text. Titles, outlets, summaries, impacts, counter-perspectives, and uncertainties are original fixtures marked Mock. News-to-theme links use the canonical `ThemeName` union and have a referential-integrity test, preventing silent count drift when fixtures change.

## D-020 — Market research data begins at a pinned version 1

Stage 4 introduces `market-research-data.json` under Electron `userData`; no earlier user research schema existed, so existing Stage 1–3 users require no migration. The v1 contract contains a symbol-keyed memo map and saved-news IDs. A tested legacy v0 array-to-v1 migrator demonstrates the required one-version-at-a-time structure. Historical types and migrator outputs use literal version numbers so a future version bump cannot skip a migration silently.

## D-021 — Personal research persistence uses narrow Main-owned capabilities

Renderer receives named load, save-memo, set-news-saved, export, and import methods only. Main validates the exact top-level Renderer sender and every payload. All filesystem paths, native dialogs, UTF-8 byte checks, parsing, migration, and atomic writes stay in Main; paths are never returned to Renderer.

## D-022 — Import is additive and preserves current judgments

An import is fully parsed, migrated, and validated before the store changes. New symbols are added and saved-news IDs are unioned, but a same-symbol conflict preserves the current memo. Unsaved Renderer drafts block both import and export. This policy avoids silently replacing a current judgment or exporting a backup that omits visible edits.

## D-023 — Market Room subspaces use persistent accessible tabs

Stage 4 adds Research, News, Themes, and Memo tabs inside Market Room instead of expanding the global sidebar. All tab and tabpanel IDs remain mounted for valid ARIA relationships, arrow/Home/End keys move between tabs, and feature state remains local to Market Room.

## D-024 — Game ideation is an ordered provider conversation

`LLMProvider` exposes start, answer, and project-creation operations, while `MockLLMProvider` implements them with deterministic rules and the existing asynchronous simulator. The domain validates question order and returns only one current question, so a future provider can replace the Mock without changing Renderer structure.

## D-025 — Game Projects use a separate versioned user-data document

Generated projects are stored in `game-atelier-data.json` under Electron `userData`, independently of `market-research-data.json`. The pinned v1 contract contains projects and `lastOpenedProjectId`, validates exact fields and limits, and uses an explicit one-version-at-a-time migration registry plus atomic temp-file replacement.

## D-026 — Built-in and user-owned projects remain distinct

`Midnight Archive` is Mock provider fixture data shipped with the application and is merged into the project shelf at the application-service boundary. It is not copied into the user file. Generated projects appear on the local shelf only after Main confirms persistence; a failed save keeps the current result available for retry without representing it as stored.

## D-027 — Rule-derived display text is bounded

User answers remain intact in their dedicated project fields, while titles and composed one-line descriptions are bounded before strict project validation. This prevents individually valid maximum-length answers from combining into an invalid project and keeps narrow layouts usable without changing the persisted schema.
## D-028 — Stage 6 adds workspace data without changing GameProject

`game-atelier-data.json` advances from v1 to v2 through an explicit one-step migration. The existing `GameProject` contract remains unchanged; project-owned Scene, Script override, and Task data live in a project-ID-keyed `projectWorkspaces` map. This preserves Stage 5 data meaning while allowing built-in and generated projects to persist editor changes.

## D-029 — Editor state uses narrow IPC and atomic userData storage

Renderer loads and saves one validated project workspace through named Preload methods. Main retains sender validation, path ownership, schema migration, bounds and size validation, and atomic replacement. Renderer receives neither filesystem paths nor generic IPC access.

## D-030 — Scene is a controlled logical canvas

Scene data uses a fixed 960×540 logical coordinate system independent of CSS pixels and device scale. Geometry helpers clamp selection, movement, resizing, and deletion outside React; the Canvas and Inspector emit complete controlled Scene values so persistence does not depend on component internals.

## D-031 — C# output remains a virtual, single-target Mock draft

The three C# examples and Unity-style asset tree are application fixtures, not filesystem files. Each supported natural-language request updates at most one allowlisted script and records content, revision, instruction, and timestamp. This avoids implying a connected LLM or Unity project and prevents partial multi-file changes from being reported as complete.

## D-032 — Preview runtime and authored workspace have different lifetimes

Scene, Script, and Task edits are durable user data. Preview score, position, pause state, and collected items are session runtime: they survive workbench tab changes because panels remain mounted, stop advancing while off-tab, and reset when the application starts a new session.

## D-033 — Pause has an explicit state transition

Starting is limited to `ready → playing`; movement input cannot resume a paused run. Only the dedicated resume action performs `paused → playing`. This keeps keyboard input from silently defeating the pause control and is covered by both unit and real Electron UI regression checks.
## D-034 — Main owns a finite update state machine

Renderer never receives `electron-updater` or a generic IPC primitive. Main maps updater events into a serializable finite state, rejects stale or invalid transitions, and exposes only state, check, download, install, and preparation acknowledgement channels through the context-isolated Preload bridge.

## D-035 — Updates require explicit download and restart choices

Packaged startup schedules a check after 15 seconds, but `autoDownload` and `autoInstallOnAppQuit` remain disabled. A downloaded update stays inert until the user chooses restart in Settings and confirms the native dialog, so normal work and ordinary app quit cannot trigger a surprise installation.

## D-036 — Installation has a fail-closed persistence barrier

Before `quitAndInstall`, Main asks the trusted top-level Renderer to flush registered data owners. Dirty investment memos, the active generated project, pending project workspace edits, and unfinished ideation input must all complete. Failure, timeout, sender mismatch, or content changing during save returns a blocked result and leaves the process running.

## D-037 — Unfinished ideation is bounded Chromium user data

The transient start/conversation draft is not added to the established `game-atelier-data.json` project schema. A small validated v1 local-storage document under Electron user data preserves the initial idea, current rules-based session, and answer input across update restart without giving Renderer filesystem access.

## D-038 — Local packaging and release publishing are separate

`dist:win` always passes `--publish never` and only creates the x64 NSIS distribution locally. Public GitHub owner/repository metadata is embedded for update discovery, while tagged GitHub Actions releases explicitly upload the Setup EXE, blockmap, and `latest.yml` using repository-scoped CI permission. No token is stored in package or application code.

## D-039 — CI and Release automation have separate trust boundaries

Branch and pull-request CI has read-only repository permission and can only install, lint, typecheck, test, and build. Windows publication exists in a separate tag-only workflow with write permission, preventing an ordinary branch build from inheriting release credentials or side effects.

## D-040 — The Git tag is a checked release identity

The Windows workflow accepts only stable `vMAJOR.MINOR.PATCH` tags and compares the complete tag against `v${package.json.version}` before packaging. A mismatch fails closed, so installer names, updater metadata, GitHub tags, and application versions cannot silently diverge.

## D-041 — electron-builder is the single Release publisher

Local `dist:win` remains permanently non-publishing. The tag workflow alone invokes `electron-builder --win --x64 --publish always`, with `GH_TOKEN` scoped to that step and sourced only from `secrets.GITHUB_TOKEN`. GitHub `releaseType: release` is followed by an API assertion for published status and the three required update assets instead of using a second action that uploads the same files again.

## D-042 — Production local content uses a restricted custom protocol

Production no longer loads the Renderer directly with privileged `file://`. Main registers a standard, secure `cabinet` scheme before app readiness and handles it after readiness. Only the `renderer` host and paths contained under the packaged Renderer root are served. The production IPC boundary accepts only `cabinet://renderer/index.html`. This allows `GrantFileProtocolExtraPrivileges` to remain disabled while preserving relative assets, ASAR integrity, CSP, and an exact trust origin.

## D-043 — Ordinary close is a fail-closed persistence operation

A close request is intercepted until all Renderer save owners acknowledge completion. Repeated close requests coalesce. A save failure leaves the BrowserWindow alive and shows an understandable native message; the next close retries. An approved updater installation bypasses this second barrier only after its own save barrier has succeeded.

## D-044 — Work-area bounds override the nominal desktop minimum

The nominal minimum remains 1100×700 where the selected display can support it. On high-DPI or small work areas, initial and restored dimensions and the BrowserWindow minimum clamp to the available work area so the title bar and controls cannot be forced off-screen. This changes placement behavior only and does not migrate user data.

## D-045 — Dependency audit exceptions require compatibility evidence

A global transitive override may not be used solely to produce an audit count of zero. The lockfile keeps the callable APIs required by minimatch 3/5/9 and the object API required by minimatch 10, using the corresponding maintenance backports. Full-audit advisory lag is documented with compatibility calls, patched source evidence, production-only audit results, and a mandatory release-time recheck.

## D-046 — Release approval requires external installation evidence

A successful local NSIS build is necessary but not sufficient for public deployment. Approval requires an anonymously accessible public feed, signed executables with expected publisher identity, a matching real tag and Published Release, and VM evidence for v0.1.0→v0.1.1 data preservation and installer-failure recovery. Missing external authority is recorded as an open release gate rather than silently simulated in production configuration.
