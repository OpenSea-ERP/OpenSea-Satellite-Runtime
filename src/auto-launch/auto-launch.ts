import AutoLaunch from 'auto-launch';
import { app } from 'electron';
import log from 'electron-log';
import { z } from 'zod';
import { createStore, type SatelliteStore } from '../store/store';

const prefSchema = z.object({ enabled: z.boolean() });
type PrefSchema = typeof prefSchema;

const prefStores = new Map<string, SatelliteStore<PrefSchema>>();
const launchers = new Map<string, InstanceType<typeof AutoLaunch>>();

function namespace(appName: string): string {
  return `autoLaunch.${appName.replace(/\s+/g, '-').toLowerCase()}`;
}

function getPrefStore(appName: string): SatelliteStore<PrefSchema> {
  let s = prefStores.get(appName);
  if (!s) {
    s = createStore({
      name: namespace(appName),
      schema: prefSchema,
      defaults: { enabled: false },
    });
    prefStores.set(appName, s);
  }
  return s;
}

function getLauncher(name: string, isHidden = true): InstanceType<typeof AutoLaunch> {
  let l = launchers.get(name);
  if (!l) {
    l = new AutoLaunch({ name, isHidden });
    launchers.set(name, l);
  }
  return l;
}

function devGuard(action: string): boolean {
  if (!app.isPackaged) {
    log.warn(`[satellite-runtime/auto-launch] ${action} no-op em dev (app.isPackaged=false)`);
    return true;
  }
  return false;
}

export interface SetupAutoLaunchOptions {
  name: string;
  isHidden?: boolean;
}

export async function setupAutoLaunch(options: SetupAutoLaunchOptions): Promise<void> {
  if (devGuard('setup')) return;
  const wanted = getPrefStore(options.name).get('enabled');
  if (wanted) {
    await enableAutoLaunch(options.name, options.isHidden);
  }
}

export async function isAutoLaunchEnabled(name: string): Promise<boolean> {
  if (devGuard('isEnabled')) return false;
  try {
    return await getLauncher(name).isEnabled();
  } catch (err) {
    log.error('[satellite-runtime/auto-launch] isEnabled failed:', err);
    return false;
  }
}

export async function enableAutoLaunch(name: string, isHidden = true): Promise<void> {
  if (devGuard('enable')) return;
  try {
    const l = getLauncher(name, isHidden);
    const enabled = await l.isEnabled();
    if (!enabled) await l.enable();
    getPrefStore(name).set('enabled', true);
    log.info(`[satellite-runtime/auto-launch] enabled (${name})`);
  } catch (err) {
    log.error('[satellite-runtime/auto-launch] enable failed:', err);
    throw err;
  }
}

export async function disableAutoLaunch(name: string): Promise<void> {
  if (devGuard('disable')) return;
  try {
    const l = getLauncher(name);
    const enabled = await l.isEnabled();
    if (enabled) await l.disable();
    getPrefStore(name).set('enabled', false);
    log.info(`[satellite-runtime/auto-launch] disabled (${name})`);
  } catch (err) {
    log.error('[satellite-runtime/auto-launch] disable failed:', err);
    throw err;
  }
}

export async function toggleAutoLaunch(name: string, isHidden = true): Promise<boolean> {
  if (devGuard('toggle')) return false;
  const enabled = await isAutoLaunchEnabled(name);
  if (enabled) {
    await disableAutoLaunch(name);
    return false;
  }
  await enableAutoLaunch(name, isHidden);
  return true;
}

/** @internal — for tests */
export function _resetAutoLaunchForTests(): void {
  prefStores.clear();
  launchers.clear();
}
