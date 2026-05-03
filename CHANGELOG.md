# Changelog

All notable changes to `@opensea/satellite-runtime` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] — 2026-05-03

### Fixed

- `updater`: `clearAutoUpdaterListeners` now uses tracked handler refs +
  `autoUpdater.off()` instead of `removeAllListeners`, preserving any
  external listeners a satellite may have added directly (Codex post-impl
  review Issue 3).
- `updater`: `quitAndInstall()` now throws if called before `setupUpdater()`,
  preventing silent fallback to default `quitAndInstallFlags={silent:true}`
  when a satellite expects custom NSIS behavior (Codex Issue 4).
- `updater`: `primeUpdaterStore({ key: null })` now writes the value
  instead of being silently skipped — semantics clarified to "undefined =
  ignore, anything else = apply if runtime store still default" (Codex
  Issue 5).

### Added

- 3 vitest tests covering quitAndInstall guard, primeUpdaterStore null
  semantics, and update-downloaded without announcedRelease (no false
  cross-check log).

## [0.3.0] — 2026-05-03

### Added

- New `updater` module (Sub-projeto B). Sub-path `@opensea/satellite-runtime/updater`.
- API: `setupUpdater(options)` (idempotent), `checkForUpdates()`, `quitAndInstall()`, `recordAnnouncedRelease(release)`, `primeUpdaterStore(seed)`.
- Constants: `RETRY_24H`, `CHECK_INTERVAL_6H`.
- Internal persistence via `createStore({ name: 'updater.preferences' })` — satellites do not mount the store.
- Optional features: `channel: 'latest' | 'beta'`, `suppressBenignReleasesAtom404` (Emporion-style), `quitAndInstallFlags` override (default silent), custom `ipcChannel`, custom retry/check intervals.
- `recordAnnouncedRelease()` cross-checks the version `electron-updater` downloads against a Satellite Contract `app.release.published` announcement (same-session best-effort; not persisted).
- `isDestroyed()` guard mandatory on every IPC broadcast.
- `primeUpdaterStore()` for satellites bridging legacy `pendingUpdateVersion`/`lastFailedUpdateAt` from their own store during migration. Idempotent (does not clobber non-default values).
- 25 vitest tests covering idempotency, broadcast, persistence, retry, periodic check, channel, 404 suppression, WS cross-check, prime/bridge.
- New peer-friendly dep: `electron-updater@^6.2.1`.

### Notes

- `devGuard` does NOT apply to `updater` — `electron-updater` already degrades gracefully in dev (`!app.isPackaged`).
- For the `channel: 'beta'` option to work, the satellite must publish `latest-beta.yml` artifacts on GitHub Releases (see `electron-builder` channel docs).
- Emporion adopting this module must pass `suppressBenignReleasesAtom404: true` to preserve its current behavior (private repo, anonymous `releases.atom` 404).

## [0.2.0] — 2026-05-03

### Added

- Initial Foundation release (Sub-projeto A do Satellite Kit).
- 9 modules: `auto-launch`, `window-state`, `single-instance`, `tray`,
  `splash`, `graceful-shutdown`, `store`, `log`, `quit-prompt`.
- `/testing` sub-path with `mockApp`, `mockStore`, `mockTray`,
  `mockBrowserWindow` helpers.
- Vitest unit suite with 80% coverage thresholds.
- GitHub Actions CI: typecheck + tests on push.
- `devGuard` pattern restricted to OS-mutating modules (only `auto-launch`).
- `graceful-shutdown` once-guard for re-entrancy safety.
- `store` corruption recovery (file unlink + recreate).
