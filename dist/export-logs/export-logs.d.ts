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
export declare function exportLogs(options?: ExportLogsOptions): Promise<string>;
//# sourceMappingURL=export-logs.d.ts.map