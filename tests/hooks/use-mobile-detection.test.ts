import { act, renderHook } from '@testing-library/react';
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
  TOUCH_UI_OVERRIDE_KEY,
  useIsTouchUi,
} from '@/platforms/mobile/use-touch-ui';

type Listener = () => void;

let pointer = { coarse: false, hover: true };
const mediaListeners = new Set<Listener>();

/**
 * `matchMedia` stub that reads live pointer state and dispatches real `change`
 * events, so tests can simulate a mouse being connected mid-session.
 */
function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        if (query.includes('pointer: coarse')) return pointer.coarse;
        if (query.includes('hover: none')) return !pointer.hover;
        return false;
      },
      media: query,
      addEventListener: (_: string, cb: Listener) => mediaListeners.add(cb),
      removeEventListener: (_: string, cb: Listener) =>
        mediaListeners.delete(cb),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }),
  });
}

function setPointer(next: Partial<typeof pointer>) {
  pointer = { ...pointer, ...next };
  for (const cb of [...mediaListeners]) cb();
}

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: ua,
  });
}

function setTouch(points: number) {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: points,
  });
  if (points > 0) {
    (window as { ontouchstart?: unknown }).ontouchstart = null;
  } else {
    delete (window as { ontouchstart?: unknown }).ontouchstart;
  }
}

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  androidTv:
    'Mozilla/5.0 (Linux; Android 14; BRAVIA 4K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

describe('useIsTouchUi', () => {
  beforeEach(() => {
    mediaListeners.clear();
    pointer = { coarse: false, hover: true };
    installMatchMedia();
    localStorage.clear();
    checkIsDesktop.mockReturnValue(false);
    checkIsMobile.mockReturnValue(false);
    setUserAgent(UA.chromeWindows);
    setTouch(0);
    setWidth(1920);
  });

  describe('touch-primary devices', () => {
    it('detects an iPhone', () => {
      setUserAgent(UA.iphone);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });

    it('detects an Android phone', () => {
      setUserAgent(UA.androidPhone);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });

    it('detects an Android tablet (no "Mobile" token, coarse + no hover)', () => {
      setUserAgent(UA.androidTablet);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });

    it('detects an iPad (desktop-class Safari UA, coarse + no hover)', () => {
      setUserAgent(UA.safariMac);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      setWidth(1024);
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });

    it('always reports touch inside the Capacitor native shell', () => {
      checkIsMobile.mockReturnValue(true);
      setUserAgent(UA.androidTablet);
      setTouch(0);
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });
  });

  describe('pointer devices', () => {
    it('reports pointer for a plain mouse desktop', () => {
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('reports pointer for macOS Safari with no touch points', () => {
      setUserAgent(UA.safariMac);
      setTouch(0);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('reports pointer for a Windows touchscreen laptop with no mouse attached', () => {
      setTouch(10);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('reports pointer for a touchscreen Chromebook', () => {
      setUserAgent(
        'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      setTouch(10);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('reports pointer inside Electron even with touch signals', () => {
      checkIsDesktop.mockReturnValue(true);
      setTouch(10);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('reports pointer on Android TV (UA contains "Android")', () => {
      localStorage.setItem('__ANDROID_TV__', 'true');
      setUserAgent(UA.androidTv);
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('ignores an Android TV user agent without a touchscreen', () => {
      setUserAgent(UA.androidTv);
      setTouch(0);
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });
  });

  describe('viewport width is not a signal', () => {
    it('stays pointer when a mouse-driven window is narrowed below 768px', () => {
      setWidth(500);
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('stays touch on a phone-sized viewport regardless of resize', () => {
      setUserAgent(UA.iphone);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);

      act(() => {
        setWidth(1200);
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current).toBe(true);
    });
  });

  describe('capability changes', () => {
    it('switches to pointer when a mouse is connected mid-session', () => {
      setUserAgent(UA.androidTablet);
      setTouch(10);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);

      act(() => setPointer({ coarse: false, hover: true }));
      expect(result.current).toBe(false);
    });
  });

  describe('override', () => {
    it('forces pointer UI when the override is set to "pointer"', () => {
      localStorage.setItem(TOUCH_UI_OVERRIDE_KEY, 'pointer');
      setUserAgent(UA.iphone);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });

    it('forces touch UI when the override is set to "touch"', () => {
      localStorage.setItem(TOUCH_UI_OVERRIDE_KEY, 'touch');
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
    });

    it('ignores an unrecognised override value', () => {
      localStorage.setItem(TOUCH_UI_OVERRIDE_KEY, 'nonsense');
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('subscribes to pointer media queries after mount', () => {
      setUserAgent(UA.iphone);
      setTouch(5);
      setPointer({ coarse: true, hover: false });
      const { result } = renderHook(() => useIsTouchUi());
      expect(result.current).toBe(true);
      expect(mediaListeners.size).toBeGreaterThan(0);
    });

    it('removes its listeners on unmount', () => {
      const removeEventListener = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useIsTouchUi());
      expect(mediaListeners.size).toBeGreaterThan(0);

      unmount();

      expect(mediaListeners.size).toBe(0);
      expect(removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      );
      removeEventListener.mockRestore();
    });
  });
});
