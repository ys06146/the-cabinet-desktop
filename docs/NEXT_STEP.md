# Next Step

Last updated: 2026-09-18

The user authorized continuing this project in the public source repository
`ys06146/the-cabinet-desktop` and adding a visible automatic-update button.
The app's top bar now opens the existing update settings and starts a check when
no update is already available or in progress. Downloads and restart installation
remain explicit user actions, with the existing save-before-install barrier.

## Continue development

- Use the local `main` branch and the configured GitHub `origin` for source changes.
- Run lint, typecheck, tests, and a production build for code changes.
- Use a local NTFS checkout for dependency installation when Google Drive's
  virtual filesystem cannot reliably write `node_modules`.

## Remaining installer release work

1. Configure Windows code signing and updater publisher verification.
2. Run a clean Windows quality gate and inspect the signed installer, updater
   metadata, and Electron fuses.
3. Prepare matching version tags and Published Releases with the Setup EXE,
   blockmap, and `latest.yml` when installer publication is requested.
4. Perform the v0.1.0-to-v0.1.1 VM procedure in `docs/UPDATE_VERIFICATION.md`,
   including data preservation and installer-failure recovery from a snapshot.

The public source repository alone does not provide downloadable updates.
The earlier Stage 9 evidence in the release documents is historical; it does not
establish that a live update or signed installer release has passed acceptance.
