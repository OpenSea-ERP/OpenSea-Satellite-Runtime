import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trayInstance, MenuMock, TrayCtor } = vi.hoisted(() => {
  const trayInstance = {
    setContextMenu: vi.fn(),
    on: vi.fn(),
    setToolTip: vi.fn(),
    destroy: vi.fn(),
    displayBalloon: vi.fn(),
  };
  return {
    trayInstance,
    MenuMock: { buildFromTemplate: vi.fn((items) => ({ _items: items })) },
    TrayCtor: vi.fn(() => trayInstance),
  };
});

vi.mock('electron', () => ({
  Tray: TrayCtor,
  Menu: MenuMock,
  nativeImage: { createFromPath: vi.fn((p: string) => ({ _path: p })) },
  app: { isPackaged: true },
}));

import { createSatelliteTray } from './tray';

describe('tray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates tray with icon and tooltip', () => {
    const handle = createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    expect(TrayCtor).toHaveBeenCalled();
    expect(trayInstance.setToolTip).toHaveBeenCalledWith('TestApp');
    expect(handle.tray).toBe(trayInstance);
  });

  it('respects custom tooltip', () => {
    createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
      tooltip: 'My Tip',
    });
    expect(trayInstance.setToolTip).toHaveBeenCalledWith('My Tip');
  });

  it('default menu contains Show and Quit', () => {
    createSatelliteTray({ iconPath: '/icon.png', appName: 'TestApp' });
    const items = MenuMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
    }>;
    expect(items.some((i) => i.label?.includes('Mostrar'))).toBe(true);
    expect(items.some((i) => i.label === 'Sair')).toBe(true);
  });

  it('prepends custom menu items with separator', () => {
    createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
      customMenuItems: [{ label: 'Configurações' }],
    });
    const items = MenuMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      type?: string;
    }>;
    expect(items[0]?.label).toBe('Configurações');
    expect(items[1]?.type).toBe('separator');
  });

  it('Show menu item invokes onShow callback', () => {
    const onShow = vi.fn();
    createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
      onShow,
    });
    const items = MenuMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      click?: () => void;
    }>;
    const showItem = items.find((i) => i.label?.includes('Mostrar'));
    showItem?.click?.();
    expect(onShow).toHaveBeenCalled();
  });

  it('Quit menu item invokes onQuit callback', () => {
    const onQuit = vi.fn();
    createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
      onQuit,
    });
    const items = MenuMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      click?: () => void;
    }>;
    items.find((i) => i.label === 'Sair')?.click?.();
    expect(onQuit).toHaveBeenCalled();
  });

  it('double-click invokes onShow callback', () => {
    const onShow = vi.fn();
    createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
      onShow,
    });
    const dblHandler = trayInstance.on.mock.calls.find((c) => c[0] === 'double-click')?.[1] as
      | undefined
      | (() => void);
    dblHandler?.();
    expect(onShow).toHaveBeenCalled();
  });

  it('updateMenu rebuilds context menu', () => {
    const handle = createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    handle.updateMenu([{ label: 'New' }]);
    expect(MenuMock.buildFromTemplate).toHaveBeenCalledTimes(2);
  });

  it('destroy calls tray.destroy', () => {
    const handle = createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    handle.destroy();
    expect(trayInstance.destroy).toHaveBeenCalled();
  });

  it('showBalloon forwards to tray.displayBalloon', () => {
    const handle = createSatelliteTray({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    handle.showBalloon('Title', 'Content');
    expect(trayInstance.displayBalloon).toHaveBeenCalledWith({
      title: 'Title',
      content: 'Content',
    });
  });
});
