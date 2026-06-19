import { apiFetch } from '@/lib/fetch';
import type {
  ContentProgress,
  PlayParams,
  PlayResponse,
  WatchProgress,
} from './types';

/**
 * Video stream URL retrieval.
 */

export async function getStreamUrl(id: string, options?: RequestInit) {
  return apiFetch(`/api/stream/${id}`, options);
}

/**
 * User's "Continue Watching" list.
 */

export async function getContinueWatching(
  limit = 10,
  options?: RequestInit,
): Promise<WatchProgress[]> {
  const result = await apiFetch<{ items: WatchProgress[] }>(
    `/api/watch/continue-watching?limit=${limit}`,
    options,
  );
  return result.items;
}

// Delete progress via HTTP
export async function deleteWatchProgress(
  progressId: string,
  callback?: (success: boolean) => void,
): Promise<boolean> {
  try {
    const result = await apiFetch<{ success: boolean }>(
      `/api/watch/progress/${progressId}`,
      { method: 'DELETE' },
    );

    if (result.success) {
      // TanStack Query handles cache invalidation via queryClient
    }
    callback?.(result.success);
    return result.success;
  } catch (_err) {
    callback?.(false);
    return false;
  }
}

/**
 * Individual content progress tracking, including high-performance caching.
 */

// Cache for content progress (2 minutes TTL)
interface ProgressCacheEntry {
  progress: ContentProgress | null;
  hasProgress: boolean;
  expiry: number;
}

const progressCache = new Map<string, ProgressCacheEntry>();
const PROGRESS_CACHE_TTL = 2 * 60 * 1000;

// Invalidate progress cache
export function invalidateProgressCache(contentId?: string): void {
  if (contentId) {
    progressCache.delete(contentId);
  } else {
    progressCache.clear();
  }
}

// Get cached progress
export function getCachedProgress(
  contentId: string,
): ProgressCacheEntry | null {
  const cached = progressCache.get(contentId);
  if (cached && cached.expiry > Date.now()) {
    return cached;
  }
  return null;
}

// Set progress cache
export function setProgressCache(
  contentId: string,
  progress: ContentProgress | null,
  hasProgress: boolean,
): void {
  progressCache.set(contentId, {
    progress,
    hasProgress,
    expiry: Date.now() + PROGRESS_CACHE_TTL,
  });
}

// Fetch progress via HTTP (for SSR or fallback)
export async function getContentProgress(
  contentId: string,
  options?: RequestInit,
): Promise<ContentProgress | null> {
  try {
    const result = await apiFetch<{ progress: ContentProgress | null }>(
      `/api/watch/progress/${contentId}`,
      options,
    );
    const progress = result.progress;
    const hasProgress = !!(progress && progress.progressSeconds > 0);
    setProgressCache(contentId, progress, hasProgress);
    return progress;
  } catch (_e) {
    return null;
  }
}

// Fetch progress via HTTP
export function fetchContentProgress(
  contentId: string,
  callback: (progress: ContentProgress | null, hasProgress: boolean) => void,
): void {
  getContentProgress(contentId)
    .then((progress) => {
      callback(progress, !!progress);
    })
    .catch(() => callback(null, false));
}

/**
 * Video scrubbing preview support (Sprite VTT parsing and preloading).
 * Logic moved to SpriteService.ts
 */

export type { SpriteCue } from './player/services/SpriteService';
export { fetchSpriteVtt } from './player/services/SpriteService';

/**
 * Video playback trigger and status monitoring.
 */
export async function playVideo(
  params: PlayParams,
  options?: RequestInit,
): Promise<PlayResponse> {
  return apiFetch<PlayResponse>('/api/video/play', {
    method: 'POST',
    body: JSON.stringify(params),
    timeout: 120_000,
    ...options,
  });
}

/**
 * Read a cookie value by name from document.cookie.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Notify the backend that this client has stopped playback.
 */
export function stopVideo(): void {
  const csrfToken = getCookie('csrfToken');
  const url = csrfToken
    ? `/api/video/stop?_csrf=${encodeURIComponent(csrfToken)}`
    : '/api/video/stop';

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    fetch(url, { method: 'POST', keepalive: true }).catch(() => undefined);
  }
}
