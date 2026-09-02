import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  checkIsMobile: () => false,
  isDesktop: false,
  isMobile: false,
  desktopBridge: {},
}));

import { useMobileDetection } from '@/features/watch/player/hooks/useMobileDetection';

/**
 * Regression suite for desktop browsers wrongly getting the phone player skin.
 *
 * The resolved mode is published as `data-touch-ui` on `<html>`, and the control
 * components select their arrangement with the `touch-ui:` / `pointer-ui:` CSS
 * variants at any viewport width. Every case below used to return `true`, which
 * swapped a full-size desktop browser onto the mobile top bar + center controls +
 * thin seekbar, and swapped the container from `100dvh` to a 16:9 box with
 * CSS-overlay fullscreen instead of the Fullscreen API.
 */
function mockPointer({ coarse = false, hover = true } = {}) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('pointer: coarse')
        ? coarse
        : query.includes('hover: none')
          ? !hover
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

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ANDROID_TV =
  'Mozilla/5.0 (Linux; Android 14; BRAVIA 4K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('player mobile detection — desktop regressions', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPointer();
    setUserAgent(CHROME_WINDOWS);
    setTouch(0);
    setWidth(1920);
  });

  it('touchscreen laptop at 1920px with no mouse attached (coarse + hover:none)', () => {
    setTouch(10);
    mockPointer({ coarse: true, hover: false });

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('touchscreen laptop at 1920px reporting a fine pointer but hover:none', () => {
    setTouch(10);
    mockPointer({ coarse: false, hover: false });

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('touchscreen laptop at 1920px reporting a coarse pointer but hover capable', () => {
    setTouch(10);
    mockPointer({ coarse: true, hover: true });

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('mouse-only desktop with the window narrowed to 700px', () => {
    setWidth(700);

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('mouse-only desktop at 175% browser zoom (effective 731px)', () => {
    setWidth(731);

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('touchscreen laptop windowed to 1000px (coarse pointer under 1024px)', () => {
    setWidth(1000);
    setTouch(10);
    mockPointer({ coarse: true, hover: true });

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('Android TV WebView at 1920px with no touchscreen', () => {
    setUserAgent(ANDROID_TV);

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });

  it('leftover DevTools touch emulation on a desktop tab', () => {
    setTouch(1);
    mockPointer({ coarse: false, hover: true });

    const { result } = renderHook(() => useMobileDetection());
    expect(result.current).toBe(false);
  });
});
