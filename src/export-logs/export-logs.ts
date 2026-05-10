/**
 * Export-logs helper. Reads all `.log` files under the satellite's log dir
 * and writes them to a target path as a single concatenated UTF-8 file
 * (one log per section, separated by a header banner). Useful for support:
 * "click `Exportar logs`, anexe o arquivo".
 *
 * Returns the absolute path of the written file.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import log from 'electron-log';

export interface ExportLogsOptions {
  /** Optional override for the source dir. Default `app.getPath('logs')`. */
  sourceDir?: string;
  /**
   * Target file path. Default `<userData>/exported-logs-<ISO>.txt`.
   * Caller can write to a user-chosen path via `dialog.showSaveDialog`.
   */
  targetPath?: string;
  /** Filter for log filenames. Default: any `.log`. */
  filter?: (filename: string) => boolean;
}

export async function exportLogs(options: ExportLogsOptions = {}): Promise<string> {
  const sourceDir = options.sourceDir ?? app.getPath('logs');
  const targetPath =
    options.targetPath ??
    path.join(
      app.getPath('userData'),
      `exported-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`,
    );
  const filter = options.filter ?? ((f: string) => f.endsWith('.log'));

  let entries: string[];
  try {
    entries = await fs.readdir(sourceDir);
  } catch (err) {
    log.error('[satellite-runtime/export-logs] readdir failed:', err);
    throw err;
  }

  const files = entries.filter(filter).sort();
  const sections: string[] = [];
  sections.push(
    `# OpenSea satellite logs export\n# Generated: ${new Date().toISOString()}\n# Source: ${sourceDir}\n# Files: ${files.length}\n`,
  );
  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    sections.push(`\n\n===== ${file} =====\n`);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      sections.push(content);
    } catch (err) {
      sections.push(`[failed to read: ${(err as Error).message}]`);
    }
  }

  await fs.writeFile(targetPath, sections.join(''), 'utf-8');
  log.info(`[satellite-runtime/export-logs] wrote ${files.length} files → ${targetPath}`);
  return targetPath;
}
