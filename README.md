# `@opensea/satellite-runtime`

Runtime modules for OpenSea satellite desktop apps (`OpenSea-Emporion`,
`OpenSea-Horus`, `OpenSea-PrintServer`). Lifecycle, boot, persistence,
logging — all the boring-but-critical Electron infrastructure that every
satellite needs, packaged once and reused.

## Versão

**v1.0.0** — Primeira release estável. 22 módulos consumidos por todos os 3
satélites instaláveis OpenSea (Emporion, Horus, PrintServer) em produção
desde 2026-05-03.

## Instalação

Distribuído via Git URL público (sem npm registry). No `package.json` do
satélite consumidor:

```json
{
  "dependencies": {
    "@opensea/satellite-runtime": "git+https://github.com/OpenSea-ERP/OpenSea-Satellite-Runtime.git#v1.0.0"
  }
}
```

```bash
npm install
```

> **Tip:** Se um bump de git ref não pegar (`npm install` reporta "up to date"
> mas a versão antiga continua em `node_modules`), o lock está cacheado.
> Solução: `rm -rf node_modules/@opensea && rm -f package-lock.json && npm install`.

## Módulos (v1.0.0)

Cada módulo é um sub-path importável independente.

### Foundation

| Módulo | Import path | Função |
|--------|-------------|--------|
| auto-launch | `@opensea/satellite-runtime/auto-launch` | Inicialização automática no boot do OS (com devGuard em dev) |
| window-state | `@opensea/satellite-runtime/window-state` | Persistir tamanho/posição de janelas |
| single-instance | `@opensea/satellite-runtime/single-instance` | Garantir 1 instância do app |
| tray | `@opensea/satellite-runtime/tray` | Ícone + menu na bandeja do sistema |
| splash | `@opensea/satellite-runtime/splash` | Janela de boot durante init |
| graceful-shutdown | `@opensea/satellite-runtime/graceful-shutdown` | Handlers de shutdown ordenado, once-guarded |
| store | `@opensea/satellite-runtime/store` | Persistência tipada (zod schemas) com migrations e corruption recovery |
| log | `@opensea/satellite-runtime/log` | Setup centralizado do electron-log |
| quit-prompt | `@opensea/satellite-runtime/quit-prompt` | Dialog "fechar ou minimizar" com lembrar |

### Lifecycle + Conexão

| Módulo | Import path | Função |
|--------|-------------|--------|
| updater | `@opensea/satellite-runtime/updater` | Wrapper electron-updater com retry 24h, periodic 6h, WS cross-check, channel switching, primeUpdaterStore |
| ws-client | `@opensea/satellite-runtime/ws-client` | `SatelliteWSClient` (lib `ws`) com reconnect + jitter, generation guard, heartbeat, hello/bearer auth |
| connection-state | `@opensea/satellite-runtime/connection-state` | Broadcaster IPC narrow para `connection:status` |

### Identidade

| Módulo | Import path | Função |
|--------|-------------|--------|
| secure-store | `@opensea/satellite-runtime/secure-store` | Wrapper keytar com fallback in-memory automático em `NODE_ENV=test` |
| migrate-api-url | `@opensea/satellite-runtime/migrate-api-url` | Helper genérico de reescrita de URL stale (default gate `app.isPackaged`) |

### Observabilidade

| Módulo | Import path | Função |
|--------|-------------|--------|
| crash-reporter | `@opensea/satellite-runtime/crash-reporter` | Wrapper sobre `crashReporter` do Electron, idempotente |
| telemetry | `@opensea/satellite-runtime/telemetry` | Heartbeat opt-in (default disabled), no-PII, daily interval |
| export-logs | `@opensea/satellite-runtime/export-logs` | Empacota .log files em arquivo único pra handoff de suporte |

### UI (renderer)

| Módulo | Import path | Função |
|--------|-------------|--------|
| ui | `@opensea/satellite-runtime/ui` | `RevokedDialog` + `AboutDialog` + `UpdateBanner` zero-dep React (peer dep `react@>=18` opcional) |

### Hardware/OS + Segurança/Flags/I18n

| Módulo | Import path | Função |
|--------|-------------|--------|
| sleep-prevention | `@opensea/satellite-runtime/sleep-prevention` | Wrapper sobre `powerSaveBlocker`, idempotente |
| kiosk-mode | `@opensea/satellite-runtime/kiosk-mode` | Full-screen + zoom/devtools blockers via `before-input-event` |
| deep-link | `@opensea/satellite-runtime/deep-link` | `opensea://...` protocol handler cross-platform |
| ipc-registry | `@opensea/satellite-runtime/ipc-registry` | Typed channel registration com zod payload validation |
| feature-flags | `@opensea/satellite-runtime/feature-flags` | Remote flag pull com cache, polling, `isEnabled/getString/snapshot` |
| i18n | `@opensea/satellite-runtime/i18n` | Wrappers Intl pt-BR para date/time/number/currency/relative-time |

### Scaffolding + Testing

| Módulo | Import path | Função |
|--------|-------------|--------|
| scaffolding | `npx create-opensea-satellite my-app` | CLI bin que gera novo satélite pré-wired ao runtime |
| testing | `@opensea/satellite-runtime/testing` | `mockApp`, `mockStore`, `mockTray`, `mockBrowserWindow` para vitest

## Boot canônico

```ts
import { app } from 'electron';
import { setupLog, getLogger } from '@opensea/satellite-runtime/log';
import { ensureSingleInstance } from '@opensea/satellite-runtime/single-instance';
import { setupAutoLaunch } from '@opensea/satellite-runtime/auto-launch';
import { restoreWindowState } from '@opensea/satellite-runtime/window-state';
import { createSatelliteTray } from '@opensea/satellite-runtime/tray';
import { registerShutdownHandler, runShutdownHandlers } from '@opensea/satellite-runtime/graceful-shutdown';

setupLog({ scope: 'my-satellite' });
ensureSingleInstance();

app.whenReady().then(async () => {
  const win = createMainWindow();
  restoreWindowState(win, 'main-window');

  const tray = createSatelliteTray({
    iconPath: ICON_PATH,
    appName: 'My Satellite',
    onShow: () => win.show(),
    onQuit: () => app.quit(),
  });

  await setupAutoLaunch({ name: 'My Satellite' });
  registerShutdownHandler(async () => tray.destroy(), { name: 'tray' });
});

app.on('before-quit', async (e) => {
  e.preventDefault();
  await runShutdownHandlers();
  app.exit(0);
});
```

## devGuard

Apenas o módulo `auto-launch` é guardado em dev (`!app.isPackaged` → no-op + warn),
porque registra entries no autostart do OS. Os demais módulos (`store`, `tray`,
`window-state`, `single-instance`, `splash`, `quit-prompt`, `graceful-shutdown`,
`log`) rodam idênticos em dev e packaged — eles tocam apenas estado interno do app.

## Desenvolvimento

```bash
npm install
npm run typecheck
npm run test
npm run build
```

## Licença

PROPRIETARY — OpenSea ERP.
