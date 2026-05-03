# Changelog

All notable changes to `@opensea/satellite-runtime` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
