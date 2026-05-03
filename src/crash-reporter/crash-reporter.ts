/**
 * Crash reporter wrapper over Electron's built-in `crashReporter`. Sends
 * minidumps to a configurable endpoint when the app crashes natively (V8
 * OOM, SIGSEGV, GPU process crash). Idempotent setup.
 *
 * For JS exceptions inside the main process, satellite should additionally
 * register `process.on('uncaughtException', ...)` and pipe to logs — that is
 * not what `crashReporter` covers.
 */
import { crashReporter } from "electron";
import log from "electron-log";

export interface SetupCrashReporterOptions {
  /** Submission endpoint (Sentry/BugSnag/in-house). */
  submitURL: string;
  /** Product name shown in the crash report. */
  productName: string;
  /** App version. */
  companyName?: string;
  /** Whether to upload reports automatically. Default true. */
  uploadToServer?: boolean;
  /** Extra metadata sent with each report. */
  extra?: Record<string, string>;
}

let initialized = false;

export function setupCrashReporter(options: SetupCrashReporterOptions): void {
  if (initialized) {
    log.warn(
      "[satellite-runtime/crash-reporter] setupCrashReporter already called; ignoring",
    );
    return;
  }
  initialized = true;
  crashReporter.start({
    submitURL: options.submitURL,
    productName: options.productName,
    companyName: options.companyName ?? "OpenSea ERP",
    uploadToServer: options.uploadToServer ?? true,
    extra: options.extra,
  });
  log.info(
    `[satellite-runtime/crash-reporter] initialized (productName=${options.productName})`,
  );
}

/** @internal — for tests */
export function _resetCrashReporterForTests(): void {
  initialized = false;
}
