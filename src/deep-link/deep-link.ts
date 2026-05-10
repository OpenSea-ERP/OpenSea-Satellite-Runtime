/**
 * Deep-link helper. Registers a custom protocol (`opensea://`) with the OS
 * and dispatches incoming URLs to a handler. On Windows, registers via
 * `app.setAsDefaultProtocolClient` and listens for `second-instance`
 * (URL is in argv). On macOS, listens for `open-url`. On Linux, requires
 * `.desktop` file (out of scope here).
 *
 * Call from main process during boot.
 */
import { app } from 'electron';
import log from 'electron-log';

export interface DeepLinkOptions {
  protocol: string; // e.g. 'opensea'
  onUrl: (url: string) => void;
}

export function registerDeepLink(options: DeepLinkOptions): void {
  const { protocol, onUrl } = options;

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(protocol, process.execPath, [process.argv[1] as string]);
    }
  } else {
    app.setAsDefaultProtocolClient(protocol);
  }

  // macOS: open-url
  app.on('open-url', (event, url) => {
    event.preventDefault();
    log.info(`[satellite-runtime/deep-link] open-url received: ${url.slice(0, 100)}`);
    try {
      onUrl(url);
    } catch (err) {
      log.error('[satellite-runtime/deep-link] onUrl threw:', err);
    }
  });

  // Windows/Linux: second-instance carries the URL in argv
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${protocol}://`));
    if (url) {
      log.info(`[satellite-runtime/deep-link] second-instance URL received: ${url.slice(0, 100)}`);
      try {
        onUrl(url);
      } catch (err) {
        log.error('[satellite-runtime/deep-link] onUrl threw:', err);
      }
    }
  });

  // First-launch URL (Windows): protocol activation passes URL in argv.
  const initialUrl = process.argv.find((arg) => arg.startsWith(`${protocol}://`));
  if (initialUrl) {
    log.info(`[satellite-runtime/deep-link] initial URL: ${initialUrl.slice(0, 100)}`);
    try {
      onUrl(initialUrl);
    } catch (err) {
      log.error('[satellite-runtime/deep-link] onUrl threw on initial:', err);
    }
  }
}
