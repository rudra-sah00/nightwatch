import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('electron-bridge mobile detection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('checkIsMobile returns false when Capacitor is not present', async () => {
    const { checkIsMobile } = await import('@/lib/electron-bridge');
    expect(checkIsMobile()).toBe(false);
  });

  it('isMobile is false when Capacitor is not native', async () => {
    const { isMobile } = await import('@/lib/electron-bridge');
    expect(isMobile).toBe(false);
  });

  it('checkIsMobile and checkIsDesktop are functions', async () => {
    const { checkIsMobile, checkIsDesktop } = await import(
      '@/lib/electron-bridge'
    );
    expect(typeof checkIsMobile).toBe('function');
    expect(typeof checkIsDesktop).toBe('function');
  });

  it('exports desktopBridge object', async () => {
    const { desktopBridge } = await import('@/lib/electron-bridge');
    expect(desktopBridge).toBeDefined();
    expect(typeof desktopBridge.copyToClipboard).toBe('function');
    expect(typeof desktopBridge.setKeepAwake).toBe('function');
  });
});
