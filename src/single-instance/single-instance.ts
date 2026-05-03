import { app } from "electron";

export interface EnsureSingleInstanceOptions {
  onSecondInstance?: (argv: string[], cwd: string) => void;
}

export function ensureSingleInstance(
  options: EnsureSingleInstanceOptions = {},
): void {
  const isFirst = app.requestSingleInstanceLock();
  if (!isFirst) {
    app.quit();
    return;
  }
  app.on("second-instance", (_event, argv, cwd) => {
    if (options.onSecondInstance) {
      options.onSecondInstance(argv, cwd);
    }
  });
}
