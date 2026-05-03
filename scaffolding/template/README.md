# __SATELLITE_DISPLAY_NAME__

OpenSea satellite scaffolded by `create-opensea-satellite`.

## Setup

```bash
npm install
npm run dev      # local Electron development
npm run dist:win # produces a Windows installer
```

## Architecture

This satellite consumes [`@opensea/satellite-runtime`](https://github.com/OpenSea-ERP/OpenSea-Satellite-Runtime),
which provides:

- Lifecycle: `auto-launch`, `window-state`, `single-instance`, `tray`,
  `splash`, `graceful-shutdown`, `store`, `log`, `quit-prompt`
- Updater: `setupUpdater`, `recordAnnouncedRelease`, `quitAndInstall`
- Connection: `SatelliteWSClient`, `connection-state`
- Identity: `secure-store`, `migrateApiUrl`
- Observability: `crash-reporter`, `telemetry`, `export-logs`
- UI primitives: `RevokedDialog`, `AboutDialog`, `UpdateBanner`

`src/main/main.ts` shows the canonical boot sequence. Customize the
domain message dispatch and renderer wiring; runtime owns transport.

## Releasing

1. Bump `version` in `package.json`
2. Tag the commit (`git tag vX.Y.Z`)
3. Push tag — `electron-builder --publish always` ships to GitHub Releases.
4. Auto-update via `electron-updater` is wired through the runtime.

## License

PROPRIETARY — OpenSea ERP.
