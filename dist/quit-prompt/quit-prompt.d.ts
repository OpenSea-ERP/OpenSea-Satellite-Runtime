import { type BrowserWindow } from "electron";
export interface ShowQuitPromptOptions {
    win: BrowserWindow;
    appName: string;
    onMinimize?: () => void;
    onQuit?: () => void;
    rememberKey?: string;
}
export declare function showQuitPrompt(options: ShowQuitPromptOptions): Promise<"minimize" | "quit">;
/** @internal */
export declare function _resetQuitPromptForTests(): void;
//# sourceMappingURL=quit-prompt.d.ts.map