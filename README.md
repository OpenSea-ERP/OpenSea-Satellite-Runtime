# `@opensea/satellite-runtime`

Runtime modules for OpenSea satellite desktop apps (`OpenSea-Emporion`,
`OpenSea-Horus`, `OpenSea-PrintServer`). Lifecycle, boot, persistence,
logging — all the boring-but-critical Electron infrastructure that every
satellite needs, packaged once and reused.

## Versão

**v0.2.0** — Foundation (Sub-projeto A do Satellite Kit). Inclui 9 módulos:
auto-launch, window-state, single-instance, tray, splash, graceful-shutdown,
store, log, quit-prompt. Migração piloto: PrintServer.

## Instalação

Distribuído via Git URL público (sem npm registry). No `package.json` do
satélite consumidor:

```json
{
  "dependencies": {
    "@opensea/satellite-runtime": "git+https://github.com/OpenSea-ERP/OpenSea-Satellite-Runtime.git#v0.2.0"
  }
}
```

```bash
npm install
```

## Módulos

Cada módulo é um sub-path importável independente:

| Módulo | Import path | Função |
|--------|-------------|--------|
| auto-launch | `@opensea/satellite-runtime/auto-launch` | Inicialização automática no boot do OS (com devGuard em dev) |
| window-state | `@opensea/satellite-runtime/window-state` | Persistir tamanho/posição de janelas |
| single-instance | `@opensea/satellite-runtime/single-instance` | Garantir 1 instância do app |
| tray | `@opensea/satellite-runtime/tray` | Ícone + menu na bandeja do sistema |
| splash | `@opensea/satellite-runtime/splash` | Janela de boot durante init |
| graceful-shutdown | `@opensea/satellite-runtime/graceful-shutdown` | Handlers de shutdown ordenado, once-guarded |
| store | `@opensea/satellite-runtime/store` | Persistência tipada (zod schemas) com migrations |
| log | `@opensea/satellite-runtime/log` | Setup centralizado do electron-log |
| quit-prompt | `@opensea/satellite-runtime/quit-prompt` | Dialog "fechar ou minimizar" com lembrar |
| updater | `@opensea/satellite-runtime/updater` | Wrapper electron-updater com retry 24h, periodic 6h, WS cross-check, channel switching |

Helpers de teste em `@opensea/satellite-runtime/testing`.

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
