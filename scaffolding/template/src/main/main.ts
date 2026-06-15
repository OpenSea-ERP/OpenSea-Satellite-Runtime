/**
 * __SATELLITE_DISPLAY_NAME__ — main process entry.
 *
 * Boot sequence follows the canonical pattern from
 * `@openholt/satellite-runtime`:
 *   log → ensureSingleInstance → store → window-state → tray → auto-launch →
 *   updater → ws-client → graceful-shutdown.
 */

import path from 'node:path';
import { setupAutoLaunch } from '@openholt/satellite-runtime/auto-launch';
import {
  registerShutdownHandler,
  runShutdownHandlers,
} from '@openholt/satellite-runtime/graceful-shutdown';
import { getLogger, setupLog } from '@openholt/satellite-runtime/log';
import { ensureSingleInstance } from '@openholt/satellite-runtime/single-instance';
import { createSatelliteTray } from '@openholt/satellite-runtime/tray';
import { checkForUpdates, setupUpdater } from '@openholt/satellite-runtime/updater';
import { restoreWindowState } from '@openholt/satellite-runtime/window-state';
import { app, BrowserWindow } from 'electron';

const APP_NAME = '__SATELLITE_DISPLAY_NAME__';

setupLog({ scope: '__SATELLITE_NAME__' });
const log = getLogger('main');

ensureSingleInstance({
  onSecondInstance: () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  },
});

let mainWindow: BrowserWindow | null = null;

function getAssetPath(filename: string): string {
  return path.join(__dirname, '..', '..', 'assets', filename);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  restoreWindowState(mainWindow, 'main-window', {
    width: 1280,
    height: 800,
  });
  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  mainWindow.loadFile(rendererPath);
}

app.on('ready', async () => {
  log.info(`${APP_NAME} pronto`);

  createWindow();

  const tray = createSatelliteTray({
    iconPath: getAssetPath('icon.png'),
    appName: APP_NAME,
    onShow: () => mainWindow?.show(),
    onQuit: () => app.quit(),
  });

  await setupAutoLaunch({ name: APP_NAME, isHidden: true });

  setupUpdater();

  registerShutdownHandler(async () => tray.destroy(), { name: 'tray' });

  await checkForUpdates().catch((err) => {
    log.warn('Erro ao verificar atualizações:', err);
  });
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  log.info('Shutting down...');
  await runShutdownHandlers();
  app.exit(0);
});
