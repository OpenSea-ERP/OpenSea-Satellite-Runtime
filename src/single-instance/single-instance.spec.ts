import { describe, it, expect, vi, beforeEach } from "vitest";

const { appMock } = vi.hoisted(() => ({
  appMock: {
    requestSingleInstanceLock: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  },
}));

vi.mock("electron", () => ({ app: appMock }));

import { ensureSingleInstance } from "./single-instance";

describe("single-instance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers second-instance listener when first instance", () => {
    appMock.requestSingleInstanceLock.mockReturnValue(true);
    ensureSingleInstance();
    expect(appMock.quit).not.toHaveBeenCalled();
    expect(appMock.on).toHaveBeenCalledWith(
      "second-instance",
      expect.any(Function),
    );
  });

  it("quits when second instance", () => {
    appMock.requestSingleInstanceLock.mockReturnValue(false);
    ensureSingleInstance();
    expect(appMock.quit).toHaveBeenCalled();
    expect(appMock.on).not.toHaveBeenCalled();
  });

  it("invokes onSecondInstance callback when 2nd instance launches", () => {
    appMock.requestSingleInstanceLock.mockReturnValue(true);
    const cb = vi.fn();
    ensureSingleInstance({ onSecondInstance: cb });
    const handler = appMock.on.mock.calls.find(
      (c) => c[0] === "second-instance",
    )?.[1] as undefined | ((event: unknown, argv: string[], cwd: string) => void);
    handler?.({}, ["arg1"], "/cwd");
    expect(cb).toHaveBeenCalledWith(["arg1"], "/cwd");
  });

  it("works with no callback (default no-op)", () => {
    appMock.requestSingleInstanceLock.mockReturnValue(true);
    ensureSingleInstance();
    const handler = appMock.on.mock.calls.find(
      (c) => c[0] === "second-instance",
    )?.[1] as undefined | ((event: unknown, argv: string[], cwd: string) => void);
    expect(() => handler?.({}, [], "/cwd")).not.toThrow();
  });
});
