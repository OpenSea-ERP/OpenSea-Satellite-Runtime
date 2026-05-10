import { type BrowserWindow, dialog } from 'electron';
import ElectronStore from 'electron-store';

interface RememberedChoice {
  choice: 'minimize' | 'quit';
}

let store: ElectronStore<Record<string, RememberedChoice>> | null = null;

function getStore(): ElectronStore<Record<string, RememberedChoice>> {
  if (!store) {
    store = new ElectronStore<Record<string, RememberedChoice>>({
      name: 'quitPrompt.preferences',
    });
  }
  return store;
}

export interface ShowQuitPromptOptions {
  win: BrowserWindow;
  appName: string;
  onMinimize?: () => void;
  onQuit?: () => void;
  rememberKey?: string;
}

export async function showQuitPrompt(options: ShowQuitPromptOptions): Promise<'minimize' | 'quit'> {
  if (options.rememberKey) {
    const remembered = getStore().get(options.rememberKey);
    if (remembered) {
      if (remembered.choice === 'minimize') options.onMinimize?.();
      else options.onQuit?.();
      return remembered.choice;
    }
  }

  const { response, checkboxChecked } = await dialog.showMessageBox(options.win, {
    type: 'question',
    buttons: ['Minimizar', 'Sair'],
    defaultId: 0,
    cancelId: 0,
    title: options.appName,
    message: `O que você gostaria de fazer com o ${options.appName}?`,
    detail: 'Minimizar mantém o app rodando na bandeja do sistema. Sair fecha o app completamente.',
    checkboxLabel: 'Lembrar minha escolha',
    checkboxChecked: false,
  });

  const choice: 'minimize' | 'quit' = response === 0 ? 'minimize' : 'quit';

  if (options.rememberKey && checkboxChecked) {
    getStore().set(options.rememberKey, { choice });
  }

  if (choice === 'minimize') options.onMinimize?.();
  else options.onQuit?.();

  return choice;
}

/** @internal */
export function _resetQuitPromptForTests(): void {
  store = null;
}
