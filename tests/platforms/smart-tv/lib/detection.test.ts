import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTV,
  isWebOS,
  waitForTvFlag,
} from '@/platforms/smart-tv/lib/detection';

describe('isTV', () => {
  beforeEach(() => {
    window.__ANDROID_TV__ = undefined;
    localStorage.clear();
  });

  it('returns false when window.__ANDROID_TV__ is not set', () => {
    expect(isTV()).toBe(false);
  });

  it('returns true when window.__ANDROID_TV__ is true', () => {
    window.__ANDROID_TV__ = true;
    expect(isTV()).toBe(true);
  });

  it('returns true when localStorage has __ANDROID_TV__=true', () => {
    localStorage.setItem('__ANDROID_TV__', 'true');
    expect(isTV()).toBe(true);
  });

  it('returns true when on webOS (user-agent detection)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Web0S; Linux) AppleWebKit/537.36 Chrome/87.0.4280.88 Safari/537.36 WebAppManager',
      configurable: true,
    });
    expect(isTV()).toBe(true);
  });
});

describe('isWebOS', () => {
  it('returns true for webOS user-agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Web0S; Linux) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isWebOS()).toBe(true);
  });

  it('returns true for lowercase webos user-agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (webOS; Linux) SmartTV',
      configurable: true,
    });
    expect(isWebOS()).toBe(true);
  });

  it('returns false for non-webOS user-agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 12) Chrome/100',
      configurable: true,
    });
    expect(isWebOS()).toBe(false);
  });
});

describe('waitForTvFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.__ANDROID_TV__ = undefined;
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves true when flag is already set', async () => {
    window.__ANDROID_TV__ = true;
    await expect(waitForTvFlag()).resolves.toBe(true);
  });

  it('resolves true when flag appears after delay', async () => {
    const promise = waitForTvFlag();
    window.__ANDROID_TV__ = true;
    await vi.advanceTimersByTimeAsync(60);
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false after timeout when flag never appears', async () => {
    const promise = waitForTvFlag();
    await vi.advanceTimersByTimeAsync(400);
    await expect(promise).resolves.toBe(false);
  });
});
