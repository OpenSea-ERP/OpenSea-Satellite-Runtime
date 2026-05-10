import { beforeEach, describe, expect, it, vi } from 'vitest';

const { keytarMock, logMock } = vi.hoisted(() => ({
  keytarMock: {
    getPassword: vi.fn(),
    setPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
  logMock: {
    scope: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  },
}));

vi.mock('keytar', () => ({ default: keytarMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import { createSecureStore } from './secure-store';

describe('secure-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('test mode (in-memory)', () => {
    it('set/get round-trip', async () => {
      const store = createSecureStore({ service: 'test-svc', testMode: true });
      await store.set('k', 'v');
      expect(await store.get('k')).toBe('v');
      expect(keytarMock.setPassword).not.toHaveBeenCalled();
    });

    it('get returns null for missing key', async () => {
      const store = createSecureStore({ service: 'test-svc', testMode: true });
      expect(await store.get('missing')).toBeNull();
    });

    it('delete removes the key', async () => {
      const store = createSecureStore({ service: 'test-svc', testMode: true });
      await store.set('k', 'v');
      await store.delete('k');
      expect(await store.get('k')).toBeNull();
      expect(keytarMock.deletePassword).not.toHaveBeenCalled();
    });

    it('each store instance has isolated memory', async () => {
      const a = createSecureStore({ service: 'a', testMode: true });
      const b = createSecureStore({ service: 'b', testMode: true });
      await a.set('k', 'from-a');
      expect(await b.get('k')).toBeNull();
    });
  });

  describe('packaged mode (keytar)', () => {
    it('set forwards to keytar.setPassword with service+account', async () => {
      const store = createSecureStore({ service: 'OpenSea-X', testMode: false });
      await store.set('token', 'abc');
      expect(keytarMock.setPassword).toHaveBeenCalledWith('OpenSea-X', 'token', 'abc');
    });

    it('get forwards to keytar.getPassword', async () => {
      keytarMock.getPassword.mockResolvedValueOnce('stored');
      const store = createSecureStore({ service: 'OpenSea-X', testMode: false });
      const result = await store.get('token');
      expect(result).toBe('stored');
      expect(keytarMock.getPassword).toHaveBeenCalledWith('OpenSea-X', 'token');
    });

    it('delete forwards to keytar.deletePassword', async () => {
      const store = createSecureStore({ service: 'OpenSea-X', testMode: false });
      await store.delete('token');
      expect(keytarMock.deletePassword).toHaveBeenCalledWith('OpenSea-X', 'token');
    });

    it('get returns null on keytar error (no throw)', async () => {
      keytarMock.getPassword.mockRejectedValueOnce(new Error('locked'));
      const store = createSecureStore({ service: 'X', testMode: false });
      expect(await store.get('k')).toBeNull();
    });

    it('set throws on keytar error (caller must know)', async () => {
      keytarMock.setPassword.mockRejectedValueOnce(new Error('denied'));
      const store = createSecureStore({ service: 'X', testMode: false });
      await expect(store.set('k', 'v')).rejects.toThrow('denied');
    });

    it('delete swallows keytar error (best-effort cleanup)', async () => {
      keytarMock.deletePassword.mockRejectedValueOnce(new Error('not found'));
      const store = createSecureStore({ service: 'X', testMode: false });
      await expect(store.delete('k')).resolves.toBeUndefined();
    });
  });
});
