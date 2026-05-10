/**
 * Remote feature flags. Polls a configurable endpoint, caches values
 * in memory, exposes `isEnabled(flag)` and `getString(flag)`. Default
 * fallback values from `defaults` apply when fetch fails.
 */
import log from 'electron-log';

export interface FeatureFlagsOptions {
  endpoint: () => string;
  /** Default values used until the first successful fetch (and on fetch failure if cache empty). */
  defaults?: Record<string, boolean | string>;
  /** Poll interval in ms. Default 5 minutes. */
  pollIntervalMs?: number;
  /** Optional auth header builder. */
  authHeader?: () => string | null;
  /** Injectable fetch. Default `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

let cache: Record<string, boolean | string> = {};
let pollTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

async function fetchOnce(opts: FeatureFlagsOptions): Promise<void> {
  const fetcher = opts.fetchImpl ?? globalThis.fetch;
  if (!fetcher) {
    log.warn('[satellite-runtime/feature-flags] no fetch impl');
    return;
  }
  try {
    const headers: Record<string, string> = {};
    const auth = opts.authHeader?.();
    if (auth) headers.Authorization = auth;
    const res = await fetcher(opts.endpoint(), { headers });
    if (!res.ok) {
      log.warn(`[satellite-runtime/feature-flags] fetch ${res.status}; keeping cache`);
      return;
    }
    const json = (await res.json()) as Record<string, boolean | string>;
    cache = { ...cache, ...json };
  } catch (err) {
    log.warn('[satellite-runtime/feature-flags] fetch failed:', err);
  }
}

export function setupFeatureFlags(options: FeatureFlagsOptions): void {
  if (initialized) {
    log.warn('[satellite-runtime/feature-flags] already initialized; ignoring');
    return;
  }
  initialized = true;
  cache = { ...(options.defaults ?? {}) };
  void fetchOnce(options);
  pollTimer = setInterval(() => void fetchOnce(options), options.pollIntervalMs ?? 5 * 60 * 1000);
}

export function stopFeatureFlags(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  initialized = false;
  cache = {};
}

export function isEnabled(flag: string): boolean {
  const v = cache[flag];
  return v === true || v === 'true';
}

export function getString(flag: string, fallback = ''): string {
  const v = cache[flag];
  return typeof v === 'string' ? v : fallback;
}

export function snapshot(): Readonly<Record<string, boolean | string>> {
  return { ...cache };
}
