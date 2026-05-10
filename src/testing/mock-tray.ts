import type { SatelliteTrayHandle } from '../tray/tray';

interface MockTrayCalls {
  destroy: number;
  setTooltip: string[];
  showBalloon: Array<{ title: string; content: string }>;
  updateMenu: number;
}

export function mockTray(): SatelliteTrayHandle & { calls: MockTrayCalls } {
  const calls: MockTrayCalls = {
    destroy: 0,
    setTooltip: [],
    showBalloon: [],
    updateMenu: 0,
  };
  return {
    tray: {} as never,
    destroy() {
      calls.destroy += 1;
    },
    updateMenu(_items) {
      calls.updateMenu += 1;
    },
    setTooltip(text) {
      calls.setTooltip.push(text);
    },
    showBalloon(title, content) {
      calls.showBalloon.push({ title, content });
    },
    calls,
  };
}
