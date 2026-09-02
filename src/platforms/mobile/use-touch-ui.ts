'use client';

import { useEffect, useState } from 'react';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { TOUCH_UI_ATTRIBUTE } from '@/platforms/mobile/touch-ui-script';
import { isTV } from '@/platforms/smart-tv/lib/detection';

/**
 * localStorage key used to force the touch/pointer UI regardless of detection.
 *
 * Pointer media queries are wrong on some hardware (touchscreen laptops that
 * report no mouse, kiosk displays, remote-desktop sessions), so users and
 * support need a way out:
 *
 * ```js
 * localStorage.setItem('nightwatch:touch-ui', 'pointer'); // force desktop controls
 * localStorage.setItem('nightwatch:touch-ui', 'touch');   // force mobile controls
 * localStorage.removeItem('nightwatch:touch-ui');         // back to auto-detect
 * ```
 */
export const TOUCH_UI_OVERRIDE_KEY = 'nightwatch:touch-ui';

const POINTER_COARSE = '(pointer: coarse)';
const HOVER_NONE = '(hover: none)';

/**
 * Explicit touch-primary user agents.
 *
 * Deliberately does **not** match a bare `Android` token: Android TV and
 * Android tablets both report `Android` without `Mobile`, and a TV must never
 * get the phone control bar.
 */
const TOUCH_UA =
  /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

/**
 * Desktop operating systems. These are mouse-driven even when a touchscreen is
 * present, and their pointer media queries are unreliable — Windows and ChromeOS
 * report `pointer: coarse` / `hover: none` whenever no mouse happens to be
 * connected, which is indistinguishable from a tablet.
 *
 * `Android` never matches: its UA is `Linux; Android ...`, not `X11` or
 * `Linux x86_64`.
 */
const DESKTOP_OS_UA = /Windows NT|X11|Linux x86_64|CrOS/i;

/** macOS — also reported by iPadOS Safari, which is separated by touch points. */
const MAC_OS_UA = /Macintosh|Mac OS X/i;

function readOverride(): 'touch' | 'pointer' | null {
  try {
    const value = localStorage.getItem(TOUCH_UI_OVERRIDE_KEY);
    return value === 'touch' || value === 'pointer' ? value : null;
  } catch {
    // localStorage can throw in private mode / sandboxed iframes
    return null;
  }
}

function isTvSafe(): boolean {
  try {
    // isTV() touches localStorage, which throws in sandboxed iframes.
    return isTV();
  } catch {
    return false;
  }
}

function mediaMatches(query: string): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  );
}

/**
 * Returns `true` when the device is **touch-primary** — a phone or tablet whose
 * main input is a finger.
 *
 * This is a device-capability check, **not** a viewport check. Viewport width is
 * deliberately ignored: a narrow desktop window, a split-screen window or 175%
 * browser zoom is still a mouse-driven desktop, and responsive layout is handled
 * by Tailwind's `md:` breakpoint instead.
 *
 * Order of precedence:
 * 1. Explicit {@link TOUCH_UI_OVERRIDE_KEY} override.
 * 2. Electron desktop and Android TV — never touch-primary.
 * 3. Capacitor native shell — always touch-primary (including tablets).
 * 4. Explicit phone user agents ({@link TOUCH_UA}).
 * 5. Desktop OS user agents ({@link DESKTOP_OS_UA}) — never touch-primary, even
 *    with a touchscreen. iPadOS reports itself as macOS, so macOS is only
 *    treated as desktop when it reports no touch points (real Macs report `0`).
 * 6. Anything else (Android tablets, e-readers, unknown WebViews): touch API
 *    support **and** `pointer: coarse` **and** `hover: none`.
 *
 * Steps 5 and 6 exist because pointer media queries cannot distinguish an iPad
 * from a Windows touchscreen laptop with no mouse plugged in — both report
 * `coarse` + `hover: none`. The UA platform is the only reliable discriminator,
 * so it is checked first. Consequence: a Surface in tablet mode keeps the desktop
 * control bar (still finger-usable) rather than risking a 1920px laptop dropping
 * to the phone skin; {@link TOUCH_UI_OVERRIDE_KEY} is the escape hatch.
 */
export function isTouchPrimaryDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const override = readOverride();
  if (override) return override === 'touch';

  if (checkIsDesktop() || isTvSafe()) return false;
  if (checkIsMobile()) return true;

  const ua = navigator.userAgent || '';
  if (TOUCH_UA.test(ua)) return true;
  if (DESKTOP_OS_UA.test(ua)) return false;
  // iPadOS Safari sends a macOS UA; real Macs never report touch points.
  if (MAC_OS_UA.test(ua)) return navigator.maxTouchPoints > 0;

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return hasTouch && mediaMatches(POINTER_COARSE) && mediaMatches(HOVER_NONE);
}

/**
 * Writes the verified input mode to `<html>` so the CSS `touch-ui:` /
 * `pointer-ui:` variants agree with the React-side value.
 *
 * The head script already set this before first paint from the same rules; this
 * corrects the cases it could not know — most importantly a Capacitor bridge
 * that wasn't injected yet, and a mouse being connected mid-session.
 */
function syncTouchUiAttribute(isTouchUi: boolean): void {
  if (typeof document === 'undefined') return;
  const next = isTouchUi ? 'touch' : 'pointer';
  const root = document.documentElement;
  if (root.getAttribute(TOUCH_UI_ATTRIBUTE) !== next) {
    root.setAttribute(TOUCH_UI_ATTRIBUTE, next);
  }
}

/**
 * Reactive version of {@link isTouchPrimaryDevice}.
 *
 * Hydration-safe: starts as `false` on the server and during the first client
 * render, then resolves after mount. Re-evaluates when the pointer or hover
 * capability changes (e.g. a mouse is plugged into a tablet) — not just on
 * resize, which never fires for input-device changes.
 *
 * The returned value drives *behaviour* (tap zones, tap-to-toggle, fullscreen
 * strategy). Layout is driven by the `data-touch-ui` attribute this hook keeps in
 * sync, so the correct arrangement is already in the first paint rather than
 * waiting for this state to resolve.
 *
 * @returns `true` if the UI should use touch-first controls.
 */
export function useIsTouchUi(): boolean {
  const [isTouchUi, setIsTouchUi] = useState(false);

  useEffect(() => {
    const update = () => {
      const next = isTouchPrimaryDevice();
      syncTouchUiAttribute(next);
      setIsTouchUi(next);
    };
    update();

    const lists =
      typeof window.matchMedia === 'function'
        ? [window.matchMedia(POINTER_COARSE), window.matchMedia(HOVER_NONE)]
        : [];
    for (const mql of lists) mql.addEventListener?.('change', update);
    // Resize/orientation don't change the result on their own, but they are
    // cheap re-checks for browsers that don't fire pointer media-query events.
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });

    return () => {
      for (const mql of lists) mql.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isTouchUi;
}
