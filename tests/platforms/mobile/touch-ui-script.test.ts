import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkIsDesktop = vi.fn(() => false);
const checkIsMobile = vi.fn(() => false);

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => checkIsDesktop(),
  checkIsMobile: () => checkIsMobile(),
  isDesktop: false,
  isMobile: false,
  desktopBridge: {},
}));

import {
  TOUCH_UI_ATTRIBUTE,
  TOUCH_UI_INLINE_SCRIPT,
} from '@/platforms/mobile/touch-ui-script';
import {
  isTouchPrimaryDevice,
  TOUCH_UI_OVERRIDE_KEY,
} from '@/platforms/mobile/use-touch-ui';

/**
 * The head script cannot import the TypeScript predicate — it runs before any
 * bundle is evaluated — so the rules are duplicated. This suite runs the real
 * script source in jsdom and asserts it reaches the same verdict as
 * `isTouchPrimaryDevice` for every device in the matrix, so the two cannot drift.
 */

interface Device {
  name: string;
  ua: string;
  touchPoints: number;
  coarse: boolean;
  hover: boolean;
  expected: 'touch' | 'pointer';
  /** Simulated native shells / TV flags. */
  electron?: boolean;
  capacitor?: boolean;
  androidTvFlag?: boolean;
}

const DEVICES: Device[] = [
  {
    name: 'iPhone Safari',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    touchPoints: 5,
    coarse: true,
    hover: false,
    expected: 'touch',
  },
  {
    name: 'Android phone Chrome',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    touchPoints: 5,
    coarse: true,
    hover: false,
    expected: 'touch',
  },
  {
    name: 'Android tablet Chrome',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    touchPoints: 5,
    coarse: true,
    hover: false,
    expected: 'touch',
  },
  {
    name: 'iPad Safari (macOS UA)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    touchPoints: 5,
    coarse: true,
    hover: false,
    expected: 'touch',
  },
  {
    name: 'macOS Safari',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    touchPoints: 0,
    coarse: false,
    hover: true,
    expected: 'pointer',
  },
  {
    name: 'Windows Chrome',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    touchPoints: 0,
    coarse: false,
    hover: true,
    expected: 'pointer',
  },
  {
    name: 'Windows touchscreen laptop, no mouse',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    touchPoints: 10,
    coarse: true,
    hover: false,
    expected: 'pointer',
  },
  {
    name: 'Touchscreen Chromebook',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    touchPoints: 10,
    coarse: true,
    hover: false,
    expected: 'pointer',
  },
  {
    name: 'Linux desktop Firefox',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    touchPoints: 0,
    coarse: false,
    hover: true,
    expected: 'pointer',
  },
  {
    name: 'Android TV WebView',
    ua: 'Mozilla/5.0 (Linux; Android 14; BRAVIA 4K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    touchPoints: 0,
    coarse: true,
    hover: false,
    expected: 'pointer',
    androidTvFlag: true,
  },
  {
    name: 'Electron desktop with touchscreen',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Electron/33.0.0 Safari/537.36',
    touchPoints: 10,
    coarse: true,
    hover: false,
    expected: 'pointer',
    electron: true,
  },
  {
    name: 'Capacitor native shell on a tablet',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    touchPoints: 0,
    coarse: false,
    hover: true,
    expected: 'touch',
    capacitor: true,
  },
];

/**
 * Applies a device fixture to the real `window`, for `isTouchPrimaryDevice`.
 *
 * The shared test setup defines a non-configurable `window.electronAPI`, so
 * native-shell state is expressed through the mocked electron-bridge here and
 * through {@link scriptGlobals} for the script.
 */
function applyDevice(device: Device) {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: device.ua,
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: device.touchPoints,
  });
  if (device.touchPoints > 0) {
    (window as { ontouchstart?: unknown }).ontouchstart = null;
  } else {
    delete (window as { ontouchstart?: unknown }).ontouchstart;
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('pointer: coarse')
        ? device.coarse
        : query.includes('hover: none')
          ? !device.hover
          : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }),
  });
  checkIsDesktop.mockReturnValue(device.electron === true);
  checkIsMobile.mockReturnValue(device.capacitor === true);
  if (device.androidTvFlag) localStorage.setItem('__ANDROID_TV__', 'true');
}

/** Synthesised globals the head script sees for a device fixture. */
function scriptGlobals(device: Device, store: Record<string, string>) {
  const fakeWindow: Record<string, unknown> = {
    navigator: { userAgent: device.ua, maxTouchPoints: device.touchPoints },
  };
  if (device.touchPoints > 0) fakeWindow.ontouchstart = null;
  if (device.electron) fakeWindow.electronAPI = {};
  if (device.androidTvFlag) fakeWindow.__ANDROID_TV__ = true;
  if (device.capacitor) {
    fakeWindow.Capacitor = { isNativePlatform: () => true };
  }
  return {
    window: fakeWindow,
    navigator: fakeWindow.navigator,
    matchMedia: (query: string) => ({
      matches: query.includes('pointer: coarse')
        ? device.coarse
        : query.includes('hover: none')
          ? !device.hover
          : false,
    }),
    localStorage: {
      getItem: (key: string) => store[key] ?? null,
    },
  };
}

/**
 * Executes the real inline script source with the given globals shadowed, and
 * returns the attribute value it wrote.
 */
function runInlineScript(
  device: Device,
  store: Record<string, string> = {},
): string | null {
  const g = scriptGlobals(device, store);
  let written: string | null = null;
  const fakeDocument = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        if (name === TOUCH_UI_ATTRIBUTE) written = value;
      },
    },
  };
  const run = new Function(
    'window',
    'navigator',
    'document',
    'matchMedia',
    'localStorage',
    TOUCH_UI_INLINE_SCRIPT,
  );
  run(g.window, g.navigator, fakeDocument, g.matchMedia, g.localStorage);
  return written;
}

describe('touch-ui head script', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe.each(DEVICES)('$name', (device) => {
    it(`resolves to "${device.expected}" before paint`, () => {
      expect(runInlineScript(device)).toBe(device.expected);
    });

    it('agrees with isTouchPrimaryDevice', () => {
      applyDevice(device);
      const fromScript = runInlineScript(device);
      const fromPredicate = isTouchPrimaryDevice() ? 'touch' : 'pointer';
      expect(fromScript).toBe(fromPredicate);
    });
  });

  describe('override', () => {
    const phone = DEVICES[0];
    const windowsDesktop = DEVICES[5];

    it('honours a forced pointer override on a phone', () => {
      applyDevice(phone);
      localStorage.setItem(TOUCH_UI_OVERRIDE_KEY, 'pointer');
      expect(
        runInlineScript(phone, { [TOUCH_UI_OVERRIDE_KEY]: 'pointer' }),
      ).toBe('pointer');
      expect(isTouchPrimaryDevice()).toBe(false);
    });

    it('honours a forced touch override on a desktop', () => {
      applyDevice(windowsDesktop);
      localStorage.setItem(TOUCH_UI_OVERRIDE_KEY, 'touch');
      expect(
        runInlineScript(windowsDesktop, { [TOUCH_UI_OVERRIDE_KEY]: 'touch' }),
      ).toBe('touch');
      expect(isTouchPrimaryDevice()).toBe(true);
    });
  });

  it('falls back to pointer for an unknown user agent with no touch', () => {
    expect(
      runInlineScript({ ...DEVICES[5], ua: 'unknown-agent', touchPoints: 0 }),
    ).toBe('pointer');
  });

  it('writes nothing instead of throwing when browser APIs are missing', () => {
    const run = new Function(
      'window',
      'navigator',
      'document',
      'matchMedia',
      'localStorage',
      TOUCH_UI_INLINE_SCRIPT,
    );
    // No matchMedia, and a localStorage that throws (private mode / sandbox).
    expect(() =>
      run(
        { navigator: { userAgent: 'unknown', maxTouchPoints: 1 } },
        { userAgent: 'unknown', maxTouchPoints: 1 },
        undefined,
        undefined,
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
      ),
    ).not.toThrow();
  });
});
