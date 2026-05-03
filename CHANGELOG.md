# Changelog

All notable changes to `@opensea/satellite-runtime` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] — 2026-05-03

### Added

- New `create-opensea-satellite` CLI (Sub-projeto G). Run `npx create-opensea-satellite my-app` to scaffold a new Electron satellite pre-wired to the runtime, with `package.json` deps (contract + runtime + electron-builder + vite), `tsconfig.main.json` with the `paths` override for runtime sub-paths, `src/main/main.ts` showing the canonical boot sequence, GitHub Actions CI template (windows-latest runner), `.gitignore`, and a README explaining release flow.
- `scaffolding/` directory now ships with the package (`files` includes it).

### Notes

- The CLI is intentionally minimal: no prompts, no template variants. Generates one canonical layout. Customize after scaffolding.
- Template currently pins runtime `#v0.7.0` — bump on the next runtime release.

## [0.7.0] — 2026-05-03

### Added

- New `ui` sub-path (Sub-projeto F) — headless React components for renderers. Imported via `@opensea/satellite-runtime/ui`.
- `RevokedDialog` — full-screen modal for `device.revoked` events.
- `AboutDialog` — modal showing app version + channel + build + links.
- `UpdateBanner` — top banner with status (checking/available/downloading/downloaded/error) + "Reiniciar e instalar" button.
- All 3 components are zero-dependency (inline styles, no CSS framework required), accept `className` for design-system overrides, fully typed React 18/19 props.
- New peer dep: `react@>=18` (optional — runtime modules outside `/ui` work without React).
- New devDep: `@types/react@^19.0.0`.
- TS config gained `jsx: 'react-jsx'`; `tsx` files included in build.

### Notes

- Lock screen (PIN gate, Emporion-only today), Toast/notification surface, Settings page base, theme toggle DEFERRED — sufficient surface here for v0.7.0; expand on demand.

## [0.6.0] — 2026-05-03

### Added

- New `crash-reporter` module (Sub-projeto E). `setupCrashReporter({ submitURL, productName, ... })` wraps Electron's built-in `crashReporter` with idempotent setup and OpenSea defaults.
- New `telemetry` module. `setupTelemetry({ endpoint, deviceId, appName, enabled, intervalMs?, fetchImpl? })` — opt-in (default `enabled: false`), no PII, ships `{ device_id, app_name, app_version, os, platform, locale, last_seen, custom? }` at boot + on a daily interval. Injectable `fetchImpl` for tests.
- New `export-logs` module. `exportLogs({ sourceDir?, targetPath?, filter? })` reads all `.log` files under the satellite's log dir and writes them as a single concatenated UTF-8 file with section banners — useful for support handoff.
- 20 vitest tests covering: idempotency, opt-in gate, daily interval, no-PII payload, network error swallow, custom targets, read failures noted inline.

### Notes

- Performance metrics module (boot time, memory, WS latency histograms) deferred — no shared code among satellites yet.

## [0.5.0] — 2026-05-03

### Added

- New `secure-store` module (Sub-projeto D). `createSecureStore({ service, testMode? })` returns `{ get, set, delete }`. Auto in-memory backend when `NODE_ENV=test` (Emporion gold standard) — Playwright suites do not pollute Credential Manager. Per-instance memory isolation across services.
- New `migrate-api-url` module. `migrateApiUrl({ read, write, staleUrls, canonicalUrl })` extracts the identical pattern from PrintServer and Emporion. Default no-op in dev unless `force: true`.
- 16 vitest tests covering test-mode + packaged-mode paths, error swallow contracts, multi-instance isolation, dev/force gates.
- New dep: `keytar@^7.9.0`.

### Notes

- Pair flow, `RevokedDialog` UI, and audit trail kept satellite-specific (no
  shared code among the 3 satellites). The runtime only ships the
  primitives those flows compose with.

## [0.4.1] — 2026-05-03

### Fixed

- `ws-client`: `destroy()` now bumps `generation` so any in-flight `openSocket()`
  awaiting `auth.token()` bails out before attaching listeners. Closes a
  resurrection race where a client destroyed during async auth could still
  create a live socket and transition back to `connected` (Codex post-impl
  review BLOCKER).
- `ws-client`: `handleErrorPath` now consults `shouldReconnect` BEFORE setting
  state to `'reconnecting'`. Non-reconnectable closes (4001/4003 / custom veto)
  now go directly `connected → closed` without a spurious `'reconnecting'`
  transition (Codex review HIGH).
- `ws-client`: `send()` now returns `boolean` reflecting whether the JSON was
  handed to the socket (vs swallowed). Wrapper consumers can propagate
  delivery success accurately (Codex review MEDIUM).
- `ws-client`: post-await guards check `this.destroyed` in addition to
  generation, hardening against any future async paths.

## [0.4.0] — 2026-05-03

### Added

- New `ws-client` module (Sub-projeto C). Class `SatelliteWSClient` with idempotent `connect()`, exponential backoff + jitter reconnect, heartbeat (ping + pong watchdog + optional app-level), per-socket generation guard for stale event isolation, built-in routing of Satellite Contract `app.release.published` (with wire-name normalization via `fromWireSatelliteKind`) + `device.revoked` events.
- Auth modes: `bearer-header` and `hello-message` (custom mode + socket.io adapter deferred to v0.4.x).
- `shouldReconnect({ closeCode, error, phase })` hook with default that refuses reconnect on close codes 4001 (auth fail) and 4003 (revoked).
- `waiting-auth` state for token-null pre-pair scenario; `connect()` is re-entrant after token appears.
- Injectable `WebSocketImpl` and `jitterFn` for deterministic tests.
- New `connection-state` module — narrow IPC broadcaster for `connection:status` payload, with `isDestroyed()` guard. Does NOT poll or derive from multiple sources; satellites combine WS state + this broadcaster.
- 35 vitest tests using stateful `FakeWebSocket` (per-instance event control), covering: lifecycle, reconnect, heartbeat cleanup on every path, generation ownership (late close from old socket ignored), routeShared kind filter (canonical + wire), validator drop, swallowed handler throws.
- `@opensea/satellite-contract` is now a direct dependency (was unused before).
- New deps: `ws@^8.16.0`, `@types/ws` devDep.

### Notes

- Bug fixes integrados durante extraction:
  - heartbeat cleanup em todos os paths (open close/error/destroy/heartbeat-timeout)
  - multi-call `connect()` em estados ativos é no-op com warn (Horus tinha race aqui)
  - generation guard previne late events de socket antigo poluírem state do novo
- Migration aceita validators e domain handlers passados pelo satélite (transport-only no runtime).

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
