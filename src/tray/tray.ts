import {
  Tray,
  Menu,
  nativeImage,
  type MenuItemConstructorOptions,
} from "electron";

export interface CreateSatelliteTrayOptions {
  iconPath: string;
  appName: string;
  onShow?: () => void;
  onQuit?: () => void;
  customMenuItems?: MenuItemConstructorOptions[];
  tooltip?: string;
}

export interface SatelliteTrayHandle {
  tray: Tray;
  destroy(): void;
  updateMenu(items: MenuItemConstructorOptions[]): void;
  setTooltip(text: string): void;
  showBalloon(title: string, content: string): void;
}

export function createSatelliteTray(
  options: CreateSatelliteTrayOptions,
): SatelliteTrayHandle {
  const tray = new Tray(nativeImage.createFromPath(options.iconPath));
  const tooltip = options.tooltip ?? options.appName;
  tray.setToolTip(tooltip);

  function buildMenu(
    custom: MenuItemConstructorOptions[] = [],
  ): MenuItemConstructorOptions[] {
    const items: MenuItemConstructorOptions[] = [];
    items.push(...custom);
    if (custom.length > 0) items.push({ type: "separator" });
    items.push({
      label: `Mostrar ${options.appName}`,
      click: () => options.onShow?.(),
    });
    items.push({ type: "separator" });
    items.push({
      label: "Sair",
      click: () => options.onQuit?.(),
    });
    return items;
  }

  tray.setContextMenu(Menu.buildFromTemplate(buildMenu(options.customMenuItems)));
  tray.on("double-click", () => options.onShow?.());

  return {
    tray,
    destroy() {
      tray.destroy();
    },
    updateMenu(items) {
      tray.setContextMenu(Menu.buildFromTemplate(items));
    },
    setTooltip(text) {
      tray.setToolTip(text);
    },
    showBalloon(title, content) {
      tray.displayBalloon({ title, content });
    },
  };
}
