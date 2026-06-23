import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTV, waitForTvFlag } from '@/platforms/smart-tv/lib/detection';

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
