/**
 * Sleep prevention via Electron's `powerSaveBlocker`. Useful for kiosk POS
 * (Emporion) and biometric clock (Horus) where the screen must stay on.
 *
 * `start()` is idempotent within a single satellite — only one block is
 * held at a time per process; subsequent starts are no-ops.
 */
import { powerSaveBlocker } from "electron";
import log from "electron-log";

export type SleepBlockType = "prevent-app-suspension" | "prevent-display-sleep";

let blockerId: number | null = null;

export function startSleepPrevention(
  type: SleepBlockType = "prevent-display-sleep",
): boolean {
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
    log.warn(
      "[satellite-runtime/sleep-prevention] already started; ignoring",
    );
    return true;
  }
  blockerId = powerSaveBlocker.start(type);
  log.info(
    `[satellite-runtime/sleep-prevention] started (id=${blockerId}, type=${type})`,
  );
  return true;
}

export function stopSleepPrevention(): void {
  if (blockerId === null) return;
  if (powerSaveBlocker.isStarted(blockerId)) {
    powerSaveBlocker.stop(blockerId);
    log.info(
      `[satellite-runtime/sleep-prevention] stopped (id=${blockerId})`,
    );
  }
  blockerId = null;
}

export function isSleepPreventionActive(): boolean {
  return blockerId !== null && powerSaveBlocker.isStarted(blockerId);
}

/** @internal — for tests */
export function _resetSleepPreventionForTests(): void {
  blockerId = null;
}
