import log from 'electron-log';

let initialized = false;

export interface SetupLogOptions {
  scope: string;
  level?: 'silly' | 'debug' | 'info' | 'warn' | 'error' | 'verbose';
  rotation?: { maxSizeMb?: number };
}

export function setupLog(options: SetupLogOptions): void {
  if (initialized) {
    log.warn('[satellite-runtime/log] setupLog already called; ignoring');
    return;
  }
  initialized = true;

  const level = options.level ?? 'info';
  const maxSizeMb = options.rotation?.maxSizeMb ?? 10;

  log.transports.file.level = level;
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{scope}] [{level}] {text}';
  log.transports.file.maxSize = maxSizeMb * 1024 * 1024;

  log.transports.console.level = level;
  log.transports.console.format = '[{scope}] [{level}] {text}';

  log.info(`[satellite-runtime/log] initialized (scope=${options.scope}, level=${level})`);
}

export function getLogger(scopeName: string): ReturnType<typeof log.scope> {
  return log.scope(scopeName);
}

/** @internal — only for tests */
export function _resetLogForTests(): void {
  initialized = false;
}
