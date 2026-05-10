import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createStore } from './store';

interface MockStoreState {
  data: Record<string, unknown>;
  defaults: Record<string, unknown>;
  path: string;
  throwOnConstruct: Error | null;
}

const stores: Map<string, MockStoreState> = new Map();
let nextThrow: Error | null = null;

vi.mock('electron-store', () => {
  const ElectronStoreMock = vi.fn().mockImplementation(function (
    this: { store: Record<string, unknown> },
    opts: { name: string; defaults?: Record<string, unknown> },
  ) {
    if (nextThrow) {
      const e = nextThrow;
      nextThrow = null;
      throw e;
    }
    let state = stores.get(opts.name);
    if (!state) {
      state = {
        data: { ...(opts.defaults ?? {}) },
        defaults: { ...(opts.defaults ?? {}) },
        path: `/tmp/${opts.name}.json`,
        throwOnConstruct: null,
      };
      stores.set(opts.name, state);
    }
    return {
      get(key: string) {
        return state.data[key];
      },
      set(key: string, value: unknown) {
        state.data[key] = value;
      },
      delete(key: string) {
        delete state.data[key];
      },
      clear() {
        state.data = {};
      },
      get store() {
        return { ...state.data };
      },
      get path() {
        return state.path;
      },
    };
  });
  return { default: ElectronStoreMock };
});

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    unlinkSync: vi.fn(),
  },
}));

vi.mock('electron-log', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('store module', () => {
  beforeEach(() => {
    stores.clear();
    nextThrow = null;
    vi.clearAllMocks();
  });

  it('reads default values when key not set', () => {
    const schema = z.object({ apiUrl: z.string().url() });
    const store = createStore({
      name: 'test-defaults',
      schema,
      defaults: { apiUrl: 'https://api.test/' },
    });
    expect(store.get('apiUrl')).toBe('https://api.test/');
  });

  it('validates writes against schema (rejects invalid)', () => {
    const schema = z.object({ count: z.number().int().nonnegative() });
    const store = createStore({
      name: 'test-validate',
      schema,
      defaults: { count: 0 },
    });
    expect(() => store.set('count', -1 as never)).toThrow(/validation failed/);
  });

  it('persists valid writes', () => {
    const schema = z.object({ name: z.string() });
    const store = createStore({
      name: 'test-persist',
      schema,
      defaults: { name: 'default' },
    });
    store.set('name', 'updated');
    expect(store.get('name')).toBe('updated');
  });

  it('reset returns to defaults', () => {
    const schema = z.object({ flag: z.boolean() });
    const store = createStore({
      name: 'test-reset',
      schema,
      defaults: { flag: false },
    });
    store.set('flag', true);
    store.reset();
    expect(store.get('flag')).toBe(false);
  });

  it('recovers from corrupted file when onCorruption=reset (default)', async () => {
    const fs = await import('node:fs');
    (fs.default.existsSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    nextThrow = Object.assign(new Error('invalid json'), {
      path: '/tmp/corrupt.json',
    });
    const schema = z.object({ x: z.number() });
    const store = createStore({
      name: 'corrupt',
      schema,
      defaults: { x: 1 },
    });
    expect(store.get('x')).toBe(1);
    expect(fs.default.unlinkSync).toHaveBeenCalledWith('/tmp/corrupt.json');
  });

  it('rethrows corruption when onCorruption=throw', () => {
    nextThrow = Object.assign(new Error('invalid json'), {
      path: '/tmp/corrupt2.json',
    });
    const schema = z.object({ x: z.number() });
    expect(() =>
      createStore({
        name: 'corrupt2',
        schema,
        defaults: { x: 1 },
        onCorruption: 'throw',
      }),
    ).toThrow(/invalid json/);
  });

  it('forwards migrations to electron-store', async () => {
    const ElectronStoreMock = (await import('electron-store')).default as ReturnType<typeof vi.fn>;
    const migrations = { '1.4.0': vi.fn() };
    const schema = z.object({ val: z.string() });
    createStore({
      name: 'with-migrations',
      schema,
      defaults: { val: 'x' },
      migrations,
    });
    const constructorArgs =
      ElectronStoreMock.mock.calls[ElectronStoreMock.mock.calls.length - 1]?.[0];
    expect(constructorArgs.migrations).toBe(migrations);
  });
});
