import log from 'electron-log';

export interface ShutdownHandlerOptions {
  name?: string;
  timeoutMs?: number;
}

interface RegisteredHandler {
  fn: () => void | Promise<void>;
  name: string;
  timeoutMs: number;
}

const handlers: RegisteredHandler[] = [];
let shutdownPromise: Promise<void> | null = null;

export function registerShutdownHandler(
  fn: () => void | Promise<void>,
  options: ShutdownHandlerOptions = {},
): void {
  handlers.push({
    fn,
    name: options.name ?? `handler-${handlers.length}`,
    timeoutMs: options.timeoutMs ?? 5000,
  });
}

async function runWithTimeout(h: RegisteredHandler): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        log.error(
          `[satellite-runtime/shutdown] handler "${h.name}" timed out after ${h.timeoutMs}ms`,
        );
        resolve();
      }
    }, h.timeoutMs);

    Promise.resolve()
      .then(() => h.fn())
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          log.error(`[satellite-runtime/shutdown] handler "${h.name}" failed:`, err);
          resolve();
        }
      });
  });
}

/**
 * Run all registered shutdown handlers in parallel. Idempotent (returns the
 * same in-flight promise on repeated calls).
 */
export function runShutdownHandlers(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    log.info(`[satellite-runtime/shutdown] running ${handlers.length} handlers`);
    await Promise.all(handlers.map(runWithTimeout));
    log.info('[satellite-runtime/shutdown] all handlers completed');
  })();
  return shutdownPromise;
}

/** @internal */
export function _resetShutdownForTests(): void {
  handlers.length = 0;
  shutdownPromise = null;
}
