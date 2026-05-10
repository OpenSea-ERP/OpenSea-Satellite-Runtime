import { beforeEach, describe, expect, it, vi } from 'vitest';

const { appMock, fsMock, logMock } = vi.hoisted(() => ({
  appMock: {
    getPath: vi.fn((name: string) => (name === 'logs' ? '/tmp/logs' : '/tmp/userData')),
  },
  fsMock: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  logMock: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('electron', () => ({ app: appMock }));
vi.mock('node:fs/promises', () => ({ default: fsMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import { exportLogs } from './export-logs';

describe('exportLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters .log files, writes to default target', async () => {
    fsMock.readdir.mockResolvedValueOnce(['main.log', 'renderer.log', 'extra.txt']);
    fsMock.readFile.mockImplementation(async (p: string) =>
      p.endsWith('main.log') ? 'MAIN' : 'RENDER',
    );
    const result = await exportLogs();
    expect(result).toMatch(/exported-logs-/);
    const written = (fsMock.writeFile.mock.calls[0]?.[1] as string) ?? '';
    expect(written).toContain('main.log');
    expect(written).toContain('renderer.log');
    expect(written).not.toContain('extra.txt');
    expect(written).toContain('MAIN');
    expect(written).toContain('RENDER');
  });

  it('custom targetPath honored', async () => {
    fsMock.readdir.mockResolvedValueOnce(['a.log']);
    fsMock.readFile.mockResolvedValue('X');
    const result = await exportLogs({ targetPath: '/out/zip.txt' });
    expect(result).toBe('/out/zip.txt');
    expect(fsMock.writeFile).toHaveBeenCalledWith('/out/zip.txt', expect.any(String), 'utf-8');
  });

  it('custom sourceDir + filter', async () => {
    fsMock.readdir.mockResolvedValueOnce(['a.log', 'b.txt']);
    fsMock.readFile.mockResolvedValue('Z');
    await exportLogs({
      sourceDir: '/c',
      filter: (f) => f.endsWith('.txt'),
      targetPath: '/out.txt',
    });
    expect(fsMock.readdir).toHaveBeenCalledWith('/c');
    const written = fsMock.writeFile.mock.calls[0]?.[1] as string;
    expect(written).toContain('b.txt');
    expect(written).not.toContain('a.log');
  });

  it('notes failed reads inline (does not throw)', async () => {
    fsMock.readdir.mockResolvedValueOnce(['broken.log']);
    fsMock.readFile.mockRejectedValueOnce(new Error('EACCES'));
    const result = await exportLogs({ targetPath: '/out.txt' });
    expect(result).toBe('/out.txt');
    const written = fsMock.writeFile.mock.calls[0]?.[1] as string;
    expect(written).toContain('[failed to read: EACCES]');
  });

  it('rethrows readdir failure', async () => {
    fsMock.readdir.mockRejectedValueOnce(new Error('no such dir'));
    await expect(exportLogs()).rejects.toThrow('no such dir');
  });

  it('logs the file count + target', async () => {
    fsMock.readdir.mockResolvedValueOnce(['a.log', 'b.log']);
    fsMock.readFile.mockResolvedValue('');
    await exportLogs({ targetPath: '/out.txt' });
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining('wrote 2 files → /out.txt'));
  });
});
