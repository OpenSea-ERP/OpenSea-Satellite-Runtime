# OpenSea-Satellite-Runtime

**Kit de runtime para os apps satélite Electron do OpenSea ERP.** O pacote `@openholt/satellite-runtime` reúne ~24 módulos de runtime — ciclo de vida, boot, persistência, conexão e observabilidade — que todo satélite instalável (ex.: `OpenSea-Emporion`, `OpenSea-Horus`, `OpenSea-PrintServer`) precisa, empacotados uma vez e reaproveitados. Em vez de cada app reimplementar auto-launch, persistência, tray, updater e afins, todos importam o mesmo runtime testado. Cada módulo é um **sub-path importável independente** (`@openholt/satellite-runtime/<módulo>`), então o consumidor traz só o que usa. É o **companion do [`@openholt/satellite-contract`](https://github.com/OpenSea-ERP/OpenSea-Satellite-Contract)**, que define os contratos/tipos compartilhados entre servidor e satélites (canais IPC, payloads WS) — o runtime depende dele e o consome internamente. Distribuído via **Git URL**, não publicado em registry npm.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Runtime | Node >=20, TypeScript |
| Plataforma | Electron >=33 (peer), React >=18 (peer opcional, só módulo `ui`) |
| Dependências | `zod`, `electron-log`, `electron-store`, `electron-updater`, `keytar`, `ws`, `auto-launch` |
| Build/Qualidade | `tsc`, Biome (lint/format), Vitest (test + coverage v8) |

## Módulos

Esta é a peça central do pacote. Cada linha é um sub-path importável: `@openholt/satellite-runtime/<módulo>`.

### Foundation

| Módulo | O que faz |
|--------|-----------|
| `auto-launch` | Inicialização automática no boot do SO (`setupAutoLaunch`, `enable/disable/toggle/isAutoLaunchEnabled`); guardado em dev |
| `window-state` | Persiste e restaura tamanho/posição de janelas |
| `single-instance` | Garante uma única instância do app (`ensureSingleInstance`) |
| `tray` | Ícone + menu na bandeja do sistema (`createSatelliteTray`) |
| `splash` | Janela de splash exibida durante o boot/init |
| `graceful-shutdown` | Handlers de shutdown ordenado, com once-guard (`registerShutdownHandler`, `runShutdownHandlers`) |
| `store` | Persistência tipada com schemas zod, migrations e recuperação de corrupção (`createStore`) |
| `log` | Setup centralizado do `electron-log` (`setupLog`, `getLogger`) |
| `quit-prompt` | Diálogo "fechar ou minimizar" com opção de lembrar a escolha |

### Ciclo de vida + Conexão

| Módulo | O que faz |
|--------|-----------|
| `updater` | Wrapper sobre `electron-updater` (retry 24h, checagem periódica 6h, cross-check via WS, troca de canal) |
| `ws-client` | `SatelliteWSClient` (lib `ws`) com reconnect + jitter, generation guard, heartbeat e auth hello/bearer |
| `connection-state` | Broadcaster IPC estreito para o status `connection:status` |

### Identidade

| Módulo | O que faz |
|--------|-----------|
| `secure-store` | Wrapper sobre `keytar` com fallback automático in-memory em `NODE_ENV=test` |
| `migrate-api-url` | Helper genérico de reescrita de URL stale (gate padrão `app.isPackaged`) |

### Observabilidade

| Módulo | O que faz |
|--------|-----------|
| `crash-reporter` | Wrapper idempotente sobre o `crashReporter` do Electron |
| `telemetry` | Heartbeat opt-in (desligado por padrão), sem PII, intervalo diário |
| `export-logs` | Empacota arquivos `.log` em um único arquivo para handoff de suporte |

### Hardware/SO, segurança, flags e i18n

| Módulo | O que faz |
|--------|-----------|
| `sleep-prevention` | Wrapper idempotente sobre `powerSaveBlocker` |
| `kiosk-mode` | Full-screen + bloqueio de zoom/devtools via `before-input-event` |
| `deep-link` | Handler cross-platform do protocolo `opensea://...` |
| `ipc-registry` | Registro de canais IPC tipados com validação de payload por zod (`registerIpcChannel`) |
| `feature-flags` | Pull remoto de flags com cache e polling (`setupFeatureFlags`, `isEnabled`, `getString`, `snapshot`) |
| `i18n` | Wrappers `Intl` pt-BR para data/hora/número/moeda/tempo relativo |

### UI (renderer)

| Módulo | O que faz |
|--------|-----------|
| `ui` | Componentes React zero-dependência: `RevokedDialog`, `AboutDialog`, `UpdateBanner` (peer `react@>=18` opcional) |

### Testing

| Módulo | O que faz |
|--------|-----------|
| `testing` | Mocks para vitest: `mockApp`, `mockStore`, `mockTray`, `mockBrowserWindow` |

> **devGuard:** só o módulo `auto-launch` é guardado em dev (`!app.isPackaged` → no-op + warn), porque registra entries no autostart do SO. Os demais (`store`, `tray`, `window-state`, `single-instance`, `splash`, `quit-prompt`, `graceful-shutdown`, `log`) rodam idênticos em dev e em build empacotado — tocam apenas o estado interno do app.

## Estrutura

```
.
├── src/                # fonte TS — uma pasta por módulo (index + impl + .spec)
│   ├── index.ts        # re-exporta todos os módulos
│   ├── auto-launch/    # cada pasta é um sub-path importável
│   ├── store/
│   ├── ws-client/
│   ├── updater/
│   ├── ui/             # componentes React (renderer)
│   └── ...             # demais módulos
├── scaffolding/        # CLI create-opensea-satellite + template
│   ├── bin/
│   └── template/
├── dist/               # saída compilada (publicada via Git URL)
├── biome.json          # config de lint/format
├── tsconfig.json
└── vitest.config.ts
```

## Instalação

Distribuído via Git URL — fixe sempre uma tag. No `package.json` do satélite consumidor:

```json
{
  "dependencies": {
    "@openholt/satellite-runtime": "git+https://github.com/OpenSea-ERP/OpenSea-Satellite-Runtime.git#v1.0.0"
  }
}
```

```bash
npm install
```

Peer dependencies, instaladas no app consumidor:

| Peer | Versão | Obrigatória |
|------|--------|:-----------:|
| `electron` | `>=33` | sim |
| `react` | `>=18` | — (só para o módulo `ui`) |

> Se um bump de git ref não pegar (`npm install` reporta "up to date" mas a versão antiga continua em `node_modules`), o lock está cacheado. Solução: `rm -rf node_modules/@opensea && rm -f package-lock.json && npm install`.

## Uso

### Boot canônico

```ts
import { app } from 'electron';
import { setupLog, getLogger } from '@openholt/satellite-runtime/log';
import { ensureSingleInstance } from '@openholt/satellite-runtime/single-instance';
import { setupAutoLaunch } from '@openholt/satellite-runtime/auto-launch';
import { restoreWindowState } from '@openholt/satellite-runtime/window-state';
import { createSatelliteTray } from '@openholt/satellite-runtime/tray';
import {
  registerShutdownHandler,
  runShutdownHandlers,
} from '@openholt/satellite-runtime/graceful-shutdown';

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

### Persistência tipada (`store`)

```ts
import { z } from 'zod';
import { createStore } from '@openholt/satellite-runtime/store';

const store = createStore({
  name: 'settings',
  schema: z.object({ apiUrl: z.string().url(), autoLaunch: z.boolean() }),
  defaults: { apiUrl: 'https://api.opensea.com.br', autoLaunch: true },
});

store.set('autoLaunch', false);
const url = store.get('apiUrl');
```

### Logger com escopo (`log`)

```ts
import { getLogger } from '@openholt/satellite-runtime/log';

const logger = getLogger('updater');
logger.info('checando atualizações...');
```

> Também é possível importar tudo a partir da raiz (`@openholt/satellite-runtime`), mas os sub-paths reduzem o que entra no bundle do renderer.

## Scaffolding

O pacote expõe um CLI que gera um novo satélite já pré-conectado ao runtime:

```bash
npx create-opensea-satellite my-app
```

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run build` | Compila TypeScript (`tsc`) para `dist/` |
| `npm run rebuild` | `clean` + `build` |
| `npm run clean` | Remove `dist/` |
| `npm run typecheck` | Type-check sem emitir (`tsc --noEmit`) |
| `npm run test` | Roda os testes (`vitest run`) |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura (v8) |
| `npm run lint` | Lint via Biome (`biome check`) |
| `npm run lint:fix` | Lint com auto-fix |
| `npm run format` | Formata via Biome |
| `npm run ci` | Verificação Biome para CI (`biome ci`) |

## Contribuindo

Fluxo resumido (veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para o checklist completo de release):

1. Crie uma branch a partir da `main`.
2. Para um novo módulo: crie `src/<módulo>/{index.ts, <módulo>.ts, <módulo>.spec.ts}`, adicione a entry no mapa `exports` do `package.json` e o re-export em `src/index.ts`.
3. Garanta `npm run typecheck` e `npm run test` verdes.
4. Verifique o **dist freshness gate**: `git diff --exit-code -- dist/` deve ficar limpo após `npm run rebuild`.
5. Abra um PR — o CI precisa passar antes do merge.

## Licença

**PROPRIETARY** — OpenSea ERP. Todos os direitos reservados; uso exclusivo dentro do ecossistema OpenSea. Veja [LICENSE](./LICENSE).
