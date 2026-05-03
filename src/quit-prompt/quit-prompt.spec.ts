import { describe, it, expect, vi, beforeEach } from "vitest";

const { dialogMock, memStore } = vi.hoisted(() => ({
  dialogMock: { showMessageBox: vi.fn() },
  memStore: new Map<string, unknown>(),
}));

vi.mock("electron", () => ({
  dialog: dialogMock,
  app: { isPackaged: true },
}));

vi.mock("electron-store", () => ({
  default: vi.fn(() => ({
    get: (k: string) => memStore.get(k),
    set: (k: string, v: unknown) => {
      memStore.set(k, v);
    },
    clear: () => memStore.clear(),
    get store() {
      return Object.fromEntries(memStore);
    },
  })),
}));

import {
  showQuitPrompt,
  _resetQuitPromptForTests,
} from "./quit-prompt";

describe("quit-prompt", () => {
  beforeEach(() => {
    memStore.clear();
    vi.clearAllMocks();
    _resetQuitPromptForTests();
  });

  it("returns minimize on choice 0", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });
    const result = await showQuitPrompt({
      win: {} as never,
      appName: "Test",
    });
    expect(result).toBe("minimize");
  });

  it("returns quit on choice 1", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
    const result = await showQuitPrompt({
      win: {} as never,
      appName: "Test",
    });
    expect(result).toBe("quit");
  });

  it("invokes onMinimize callback for minimize", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });
    const onMinimize = vi.fn();
    await showQuitPrompt({
      win: {} as never,
      appName: "Test",
      onMinimize,
    });
    expect(onMinimize).toHaveBeenCalled();
  });

  it("invokes onQuit callback for quit", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
    const onQuit = vi.fn();
    await showQuitPrompt({ win: {} as never, appName: "Test", onQuit });
    expect(onQuit).toHaveBeenCalled();
  });

  it("persists remembered choice when checkbox is checked", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: true,
    });
    await showQuitPrompt({
      win: {} as never,
      appName: "Test",
      rememberKey: "main",
    });
    expect(memStore.has("main")).toBe(true);
  });

  it("skips dialog when remembered choice exists", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: true,
    });
    await showQuitPrompt({
      win: {} as never,
      appName: "Test",
      rememberKey: "main",
    });
    dialogMock.showMessageBox.mockClear();
    const second = await showQuitPrompt({
      win: {} as never,
      appName: "Test",
      rememberKey: "main",
    });
    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
    expect(second).toBe("minimize");
  });

  it("does not persist when checkbox is unchecked", async () => {
    dialogMock.showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
    await showQuitPrompt({
      win: {} as never,
      appName: "Test",
      rememberKey: "main",
    });
    expect(memStore.has("main")).toBe(false);
  });
});
