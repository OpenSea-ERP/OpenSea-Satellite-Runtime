import { describe, it, expect, vi, beforeEach } from "vitest";

const { powerSaveBlockerMock, logMock } = vi.hoisted(() => ({
  powerSaveBlockerMock: {
    start: vi.fn(() => 42),
    stop: vi.fn(),
    isStarted: vi.fn(() => true),
  },
  logMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("electron", () => ({ powerSaveBlocker: powerSaveBlockerMock }));
vi.mock("electron-log", () => ({ default: logMock }));

import {
  startSleepPrevention,
  stopSleepPrevention,
  isSleepPreventionActive,
  _resetSleepPreventionForTests,
} from "./sleep-prevention";

describe("sleep-prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    powerSaveBlockerMock.start.mockReturnValue(42);
    powerSaveBlockerMock.isStarted.mockReturnValue(true);
    _resetSleepPreventionForTests();
  });

  it("start uses default type prevent-display-sleep", () => {
    startSleepPrevention();
    expect(powerSaveBlockerMock.start).toHaveBeenCalledWith(
      "prevent-display-sleep",
    );
  });

  it("start respects custom type", () => {
    startSleepPrevention("prevent-app-suspension");
    expect(powerSaveBlockerMock.start).toHaveBeenCalledWith(
      "prevent-app-suspension",
    );
  });

  it("start is idempotent", () => {
    startSleepPrevention();
    startSleepPrevention();
    expect(powerSaveBlockerMock.start).toHaveBeenCalledTimes(1);
    expect(logMock.warn).toHaveBeenCalled();
  });

  it("stop calls powerSaveBlocker.stop", () => {
    startSleepPrevention();
    stopSleepPrevention();
    expect(powerSaveBlockerMock.stop).toHaveBeenCalledWith(42);
  });

  it("stop is no-op if never started", () => {
    stopSleepPrevention();
    expect(powerSaveBlockerMock.stop).not.toHaveBeenCalled();
  });

  it("isSleepPreventionActive reflects state", () => {
    expect(isSleepPreventionActive()).toBe(false);
    startSleepPrevention();
    expect(isSleepPreventionActive()).toBe(true);
    stopSleepPrevention();
    expect(isSleepPreventionActive()).toBe(false);
  });

  it("can restart after stop", () => {
    startSleepPrevention();
    stopSleepPrevention();
    startSleepPrevention();
    expect(powerSaveBlockerMock.start).toHaveBeenCalledTimes(2);
  });
});
