"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLogs = exportLogs;
/**
 * Export-logs helper. Reads all `.log` files under the satellite's log dir
 * and writes them to a target path as a single concatenated UTF-8 file
 * (one log per section, separated by a header banner). Useful for support:
 * "click `Exportar logs`, anexe o arquivo".
 *
 * Returns the absolute path of the written file.
 */
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
async function exportLogs(options = {}) {
    const sourceDir = options.sourceDir ?? electron_1.app.getPath("logs");
    const targetPath = options.targetPath ??
        node_path_1.default.join(electron_1.app.getPath("userData"), `exported-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
    const filter = options.filter ?? ((f) => f.endsWith(".log"));
    let entries;
    try {
        entries = await promises_1.default.readdir(sourceDir);
    }
    catch (err) {
        electron_log_1.default.error("[satellite-runtime/export-logs] readdir failed:", err);
        throw err;
    }
    const files = entries.filter(filter).sort();
    const sections = [];
    sections.push(`# OpenSea satellite logs export\n# Generated: ${new Date().toISOString()}\n# Source: ${sourceDir}\n# Files: ${files.length}\n`);
    for (const file of files) {
        const fullPath = node_path_1.default.join(sourceDir, file);
        sections.push(`\n\n===== ${file} =====\n`);
        try {
            const content = await promises_1.default.readFile(fullPath, "utf-8");
            sections.push(content);
        }
        catch (err) {
            sections.push(`[failed to read: ${err.message}]`);
        }
    }
    await promises_1.default.writeFile(targetPath, sections.join(""), "utf-8");
    electron_log_1.default.info(`[satellite-runtime/export-logs] wrote ${files.length} files → ${targetPath}`);
    return targetPath;
}
//# sourceMappingURL=export-logs.js.map