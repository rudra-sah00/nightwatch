import { apiFetch } from '@/lib/fetch';
import type {
  ContentProgress,
  PlayParams,
  PlayResponse,
  WatchProgress,
} from './types';

/**
 * Video metadata and stream URL retrieval.
 */

export async function getVideoDetails(id: string, options?: RequestInit) {
  return apiFetch(`/api/video/${id}`, options);
}

export async function getStreamUrl(id: string, options?: RequestInit) {
  return apiFetch(`/api/stream/${id}`, options);
}

/**
 * User's "Continue Watching" list management, including optimistic caching
 * and Socket.IO data retrieval.
 */

// Cache for continue watching items (30 seconds stale time, per server)
interface ContinueWatchingCache {
  data: WatchProgress[];
  timestamp: number;
}
const continueWatchingCache: Record<string, ContinueWatchingCache> = {};
const CONTINUE_WATCHING_STALE_TIME = 30 * 1000;

// Invalidate continue watching cache (for real-time updates)
export function invalidateContinueWatchingCache(server?: string): void {
  if (server) {
    delete continueWatchingCache[server];
  } else {
    for (const key of Object.keys(continueWatchingCache)) {
      delete continueWatchingCache[key];
    }
  }
}

// Check if cache is fresh
export function isContinueWatchingCacheFresh(server: string): boolean {
  const cache = continueWatchingCache[server];
  if (!cache) return false;
  return Date.now() - cache.timestamp < CONTINUE_WATCHING_STALE_TIME;
}

// Get cached continue watching data
export function getCachedContinueWatching(
  server: string,
): WatchProgress[] | null {
  if (isContinueWatchingCacheFresh(server)) {
    return continueWatchingCache[server].data;
  }
  return null;
}

// Update continue watching cache
export function setContinueWatchingCache(
  server: string,
  data: WatchProgress[],
): void {
  continueWatchingCache[server] = { data, timestamp: Date.now() };
}

// Remove item from cache (optimistic update)
export function removeFromContinueWatchingCache(
  server: string,
  itemId: string,
): void {
  const cache = continueWatchingCache[server];
  if (cache) {
    cache.data = cache.data.filter((i) => i.id !== itemId);
  }
}

// Fetch continue watching via HTTP (for SSR or fallback)
export async function getContinueWatching(
  limit = 10,
  server = 's2',
  options?: RequestInit,
): Promise<WatchProgress[]> {
  const result = await apiFetch<{ items: WatchProgress[] }>(
    `/api/watch/continue-watching?limit=${limit}&server=${server}`,
    options,
  );
  return result.items;
}

// Fetch continue watching via HTTP
export async function fetchContinueWatching(
  limit = 10,
  server = 's2',
  callback?: (items: WatchProgress[] | null, error?: string) => void,
): Promise<WatchProgress[] | null> {
  try {
    const items = await getContinueWatching(limit, server);
    setContinueWatchingCache(server, items);
    callback?.(items);
    return items;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to load';
    callback?.(null, errorMsg);
    return null;
  }
}

// Delete progress via HTTP
export async function deleteWatchProgress(
  progressId: string,
  server = 's2',
  callback?: (success: boolean) => void,
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ server });
    const result = await apiFetch<{ success: boolean }>(
      `/api/watch/progress/${progressId}?${params}`,
      { method: 'DELETE' },
    );

    if (result.success) {
      removeFromContinueWatchingCache(server, progressId);
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

/** Infer the provider ('s2' or 's2') from a content/series ID prefix.
 * Handles both decoded ('s2:...') and URL-encoded ('s2%3A...') IDs. */
function inferProviderFromId(id: string): 's2' | 's2' {
  try {
    const decoded = decodeURIComponent(id);
    return decoded.startsWith('s2:') ? 's2' : 's2';
  } catch {
    return id.startsWith('s2:') ? 's2' : 's2';
  }
}

// Fetch progress via HTTP (for SSR or fallback)
export async function getContentProgress(
  contentId: string,
  options?: RequestInit,
): Promise<ContentProgress | null> {
  const server = inferProviderFromId(contentId);
  try {
    const result = await apiFetch<{ progress: ContentProgress | null }>(
      `/api/watch/progress/${contentId}?server=${server}`,
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
