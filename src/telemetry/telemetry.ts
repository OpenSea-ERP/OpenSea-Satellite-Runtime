/**
 * Opt-in telemetry — collects basic device/app metrics and ships them to a
 * configurable endpoint at boot + on a daily ping. NEVER collects PII;
 * payload is `{ device_id, app_name, app_version, os, platform, locale,
 * paired_at?, last_seen, custom? }`.
 *
 * Satellites must explicitly opt-in via `setupTelemetry({ ..., enabled: true })`.
 * Default `enabled: false` — privacy-first.
 */
import { app } from 'electron';
import log from 'electron-log';

export interface TelemetryPayload {
  device_id: string;
  app_name: string;
  app_version: string;
  os: string;
  platform: NodeJS.Platform;
  locale: string;
  last_seen: string; // ISO8601
  custom?: Record<string, unknown>;
}

export interface SetupTelemetryOptions {
  /** Endpoint that accepts a POST with the JSON payload. */
  endpoint: string;
  /** Whether telemetry is enabled. Default false. */
  enabled?: boolean;
  /** Source of the device ID (typically pulled from the satellite store). */
  deviceId: () => string | null;
  /** App name (matches what the backend expects). */
  appName: string;
  /** Optional extra fields for the payload. */
  custom?: () => Record<string, unknown>;
  /** Daily ping interval in ms. Default 24h. */
  intervalMs?: number;
  /** HTTP fetch implementation. Default `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

const DAY_MS = 24 * 60 * 60 * 1000;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function buildPayload(opts: SetupTelemetryOptions): TelemetryPayload | null {
  const id = opts.deviceId();
  if (!id) return null;
  return {
    device_id: id,
    app_name: opts.appName,
    app_version: app.getVersion(),
    os: process.platform === 'win32' ? 'Windows' : process.platform,
    platform: process.platform,
    locale: app.getLocale(),
    last_seen: new Date().toISOString(),
    custom: opts.custom?.(),
  };
}

async function sendPing(opts: SetupTelemetryOptions): Promise<void> {
  const payload = buildPayload(opts);
  if (!payload) {
    log.debug('[satellite-runtime/telemetry] no deviceId yet; skipping ping');
    return;
  }
  try {
    const fetcher = opts.fetchImpl ?? globalThis.fetch;
    if (!fetcher) {
      log.warn('[satellite-runtime/telemetry] no fetch impl available; skipping ping');
      return;
    }
    const res = await fetcher(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log.warn(`[satellite-runtime/telemetry] ping responded ${res.status}`);
    }
  } catch (err) {
    log.warn('[satellite-runtime/telemetry] ping failed:', err);
  }
}

export function setupTelemetry(options: SetupTelemetryOptions): void {
  if (initialized) {
    log.warn('[satellite-runtime/telemetry] already initialized; ignoring');
    return;
  }
  initialized = true;
  if (!options.enabled) {
    log.info('[satellite-runtime/telemetry] disabled (no opt-in)');
    return;
  }
  void sendPing(options);
  pingTimer = setInterval(() => {
    void sendPing(options);
  }, options.intervalMs ?? DAY_MS);
  log.info('[satellite-runtime/telemetry] enabled');
}

export function stopTelemetry(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  initialized = false;
}
