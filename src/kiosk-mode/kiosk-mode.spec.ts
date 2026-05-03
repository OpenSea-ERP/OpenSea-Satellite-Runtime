import { describe, it, expect, vi, beforeEach } from "vitest";

const { MenuMock } = vi.hoisted(() => ({
  MenuMock: { setApplicationMenu: vi.fn() },
}));

vi.mock("electron", () => ({ Menu: MenuMock }));

import { enterKioskMode, exitKioskMode } from "./kiosk-mode";

function makeWin() {
  return {
    setKiosk: vi.fn(),
    setMenuBarVisibility: vi.fn(),
    setAutoHideMenuBar: vi.fn(),
    webContents: {
      setZoomFactor: vi.fn(),
      setVisualZoomLevelLimits: vi.fn(),
      on: vi.fn(),
    },
  };
}

describe("kiosk-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enter sets kiosk + hides menu", () => {
    const win = makeWin();
    enterKioskMode(win as never);
    expect(win.setKiosk).toHaveBeenCalledWith(true);
    expect(win.setMenuBarVisibility).toHaveBeenCalledWith(false);
    expect(win.setAutoHideMenuBar).toHaveBeenCalledWith(true);
  });

  it("enter disables app menu by default", () => {
    enterKioskMode(makeWin() as never);
    expect(MenuMock.setApplicationMenu).toHaveBeenCalledWith(null);
  });

  it("disableAppMenu=false preserves menu", () => {
    enterKioskMode(makeWin() as never, { disableAppMenu: false });
    expect(MenuMock.setApplicationMenu).not.toHaveBeenCalled();
  });

  it("disableZoom=true sets zoom + listens before-input-event", () => {
    const win = makeWin();
    enterKioskMode(win as never);
    expect(win.webContents.setZoomFactor).toHaveBeenCalledWith(1);
    expect(win.webContents.setVisualZoomLevelLimits).toHaveBeenCalledWith(1, 1);
    expect(win.webContents.on).toHaveBeenCalledWith(
      "before-input-event",
      expect.any(Function),
    );
  });

  it("zoom blocker prevents Ctrl+= keystroke", () => {
    const win = makeWin();
    enterKioskMode(win as never, { disableDevTools: false });
    const handler = win.webContents.on.mock.calls[0]?.[1] as (
      e: { preventDefault: () => void },
      input: { control: boolean; meta: boolean; shift: boolean; key: string },
    ) => void;
    const event = { preventDefault: vi.fn() };
    handler(event, { control: true, meta: false, shift: false, key: "=" });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("dev-tools blocker prevents F12", () => {
    const win = makeWin();
    enterKioskMode(win as never, { disableZoom: false });
    const handler = win.webContents.on.mock.calls[0]?.[1] as (
      e: { preventDefault: () => void },
      input: { control: boolean; meta: boolean; shift: boolean; key: string },
    ) => void;
    const event = { preventDefault: vi.fn() };
    handler(event, { control: false, meta: false, shift: false, key: "F12" });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("exit reverts kiosk + menu", () => {
    const win = makeWin();
    exitKioskMode(win as never);
    expect(win.setKiosk).toHaveBeenCalledWith(false);
    expect(win.setMenuBarVisibility).toHaveBeenCalledWith(true);
    expect(win.setAutoHideMenuBar).toHaveBeenCalledWith(false);
  });
});
