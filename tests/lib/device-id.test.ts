vi.mock('@capacitor/device', () => ({
  Device: { getInfo: vi.fn() },
}));

import { Device } from '@capacitor/device';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetInfo = vi.mocked(Device.getInfo);

describe('device-id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getDeviceId', () => {
    it('generates and persists a UUID', async () => {
      const { getDeviceId } = await import('@/lib/device-id');

      const id = getDeviceId();

      expect(id).toBeTruthy();
      expect(window.localStorage.getItem('nightwatch:device-id')).toBe(id);
    });

    it('returns the same ID on subsequent calls', async () => {
      const { getDeviceId } = await import('@/lib/device-id');

      const id1 = getDeviceId();
      const id2 = getDeviceId();

      expect(id1).toBe(id2);
    });

    it('returns existing ID from localStorage', async () => {
      window.localStorage.setItem('nightwatch:device-id', 'my-stored-id');
      const { getDeviceId } = await import('@/lib/device-id');

      const id = getDeviceId();

      expect(id).toBe('my-stored-id');
    });

    it('returns empty string on server (no window)', async () => {
      const origWindow = globalThis.window;
      // @ts-expect-error simulating server environment
      delete globalThis.window;

      const { getDeviceId } = await import('@/lib/device-id');
      const id = getDeviceId();

      expect(id).toBe('');
      globalThis.window = origWindow;
    });
  });

  describe('getDeviceInfo (sync fallback)', () => {
    it('returns "Desktop App" when electronAPI is present', async () => {
      // electronAPI is always defined in test setup
      const { getDeviceInfo } = await import('@/lib/device-id');

      expect(getDeviceInfo()).toBe('Desktop App');
    });
  });

  describe('initDeviceInfo', () => {
    it('caches async device info as Desktop App on macOS', async () => {
      mockGetInfo.mockResolvedValue({
        platform: 'web',
        operatingSystem: 'mac',
        model: 'Macintosh',
        manufacturer: 'Apple',
        isVirtual: false,
        webViewVersion: '120',
      } as Awaited<ReturnType<typeof Device.getInfo>>);

      const { initDeviceInfo, getDeviceInfo } = await import('@/lib/device-id');
      await initDeviceInfo();

      // electronAPI is present in test env, so it's "Desktop App - macOS"
      expect(getDeviceInfo()).toBe('Desktop App - macOS');
    });

    it('returns Android device info for android platform', async () => {
      mockGetInfo.mockResolvedValue({
        platform: 'android',
        operatingSystem: 'android',
        model: 'Pixel 7',
        manufacturer: 'Google',
        isVirtual: false,
        webViewVersion: '120',
      } as Awaited<ReturnType<typeof Device.getInfo>>);

      const { initDeviceInfo, getDeviceInfo } = await import('@/lib/device-id');
      await initDeviceInfo();

      expect(getDeviceInfo()).toBe('Android - Google Pixel 7');
    });

    it('returns iOS device info for ios platform', async () => {
      mockGetInfo.mockResolvedValue({
        platform: 'ios',
        operatingSystem: 'ios',
        model: 'iPhone 15',
        manufacturer: 'Apple',
        isVirtual: false,
        webViewVersion: '17',
      } as Awaited<ReturnType<typeof Device.getInfo>>);

      const { initDeviceInfo, getDeviceInfo } = await import('@/lib/device-id');
      await initDeviceInfo();

      expect(getDeviceInfo()).toBe('iOS - iPhone 15');
    });

    it('falls back to sync detection on error', async () => {
      mockGetInfo.mockRejectedValue(new Error('Not available'));

      const { initDeviceInfo, getDeviceInfo } = await import('@/lib/device-id');
      await initDeviceInfo();

      // Falls back to getDeviceInfoSync which sees electronAPI → "Desktop App"
      expect(getDeviceInfo()).toBe('Desktop App');
    });

    it('does not re-fetch if already cached', async () => {
      mockGetInfo.mockResolvedValue({
        platform: 'android',
        operatingSystem: 'android',
        model: 'Pixel 7',
        manufacturer: 'Google',
        isVirtual: false,
        webViewVersion: '120',
      } as Awaited<ReturnType<typeof Device.getInfo>>);

      const { initDeviceInfo } = await import('@/lib/device-id');
      await initDeviceInfo();
      await initDeviceInfo();

      expect(mockGetInfo).toHaveBeenCalledTimes(1);
    });
  });
});
