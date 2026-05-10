import { beforeEach, describe, expect, it, vi } from 'vitest';

const { crashReporterMock, logMock } = vi.hoisted(() => ({
  crashReporterMock: { start: vi.fn() },
  logMock: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('electron', () => ({ crashReporter: crashReporterMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import { _resetCrashReporterForTests, setupCrashReporter } from './crash-reporter';

describe('crash-reporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCrashReporterForTests();
  });

  it('calls crashReporter.start with required fields', () => {
    setupCrashReporter({ submitURL: 'https://x', productName: 'Test' });
    expect(crashReporterMock.start).toHaveBeenCalledWith(
      expect.objectContaining({
        submitURL: 'https://x',
        productName: 'Test',
        uploadToServer: true,
      }),
    );
  });

  it('default companyName is OpenSea ERP', () => {
    setupCrashReporter({ submitURL: 'x', productName: 'P' });
    expect(crashReporterMock.start).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'OpenSea ERP' }),
    );
  });

  it('respects uploadToServer override', () => {
    setupCrashReporter({
      submitURL: 'x',
      productName: 'P',
      uploadToServer: false,
    });
    expect(crashReporterMock.start).toHaveBeenCalledWith(
      expect.objectContaining({ uploadToServer: false }),
    );
  });

  it('forwards extra metadata', () => {
    setupCrashReporter({
      submitURL: 'x',
      productName: 'P',
      extra: { region: 'br' },
    });
    expect(crashReporterMock.start).toHaveBeenCalledWith(
      expect.objectContaining({ extra: { region: 'br' } }),
    );
  });

  it('is idempotent (2nd call warns and skips)', () => {
    setupCrashReporter({ submitURL: 'x', productName: 'P' });
    setupCrashReporter({ submitURL: 'y', productName: 'Q' });
    expect(crashReporterMock.start).toHaveBeenCalledTimes(1);
    expect(logMock.warn).toHaveBeenCalled();
  });
});
