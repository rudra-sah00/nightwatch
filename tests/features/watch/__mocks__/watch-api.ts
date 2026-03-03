import { vi } from 'vitest';

export const fetchContinueWatching = vi.fn();
export const deleteWatchProgress = vi.fn();
export const getCachedContinueWatching = vi.fn(() => null);
export const invalidateContinueWatchingCache = vi.fn();
export const setContinueWatchingCache = vi.fn();
export const isContinueWatchingCacheFresh = vi.fn(() => false);
export const removeFromContinueWatchingCache = vi.fn();
export const invalidateProgressCache = vi.fn();
export const getCachedProgress = vi.fn(() => null);
export const setProgressCache = vi.fn();
