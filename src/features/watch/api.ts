import { apiFetch } from '@/lib/fetch';
import { getSocket } from '@/lib/socket';
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
  server = 's1',
  options?: RequestInit,
): Promise<WatchProgress[]> {
  const result = await apiFetch<{ items: WatchProgress[] }>(
    `/api/watch/continue-watching?limit=${limit}&server=${server}`,
    options,
  );
  return result.items;
}

// Fetch continue watching via Socket.IO
interface SocketResponse {
  success: boolean;
  items?: WatchProgress[];
  error?: string;
}

export function fetchContinueWatching(
  limit = 10,
  server = 's1',
  callback: (items: WatchProgress[] | null, error?: string) => void,
): void {
  const socket = getSocket();
  if (!socket?.connected) {
    // If socket not connected, try HTTP fallback
    getContinueWatching(limit, server)
      .then((items) => callback(items))
      .catch((err) => callback(null, err.message || 'Failed to load'));
    return;
  }

  const TIMEOUT_MS = 10_000;
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      callback(null, 'Request timed out');
    }
  }, TIMEOUT_MS);

  socket.emit(
    'watch:get_continue_watching',
    { limit, providerId: server },
    (response: SocketResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (response?.success && response.items) {
        setContinueWatchingCache(server, response.items);
        callback(response.items);
      } else {
        callback(null, response?.error || 'Failed to load');
      }
    },
  );
}

// Delete progress via Socket.IO
export function deleteWatchProgress(
  progressId: string,
  server = 's1',
  callback: (success: boolean) => void,
): void {
  const socket = getSocket();
  if (!socket?.connected) {
    callback(false);
    return;
  }

  socket.emit(
    'watch:delete_progress',
    { progressId, providerId: server },
    (response: SocketResponse) => {
      if (response?.success) {
        removeFromContinueWatchingCache(server, progressId);
        callback(true);
      } else {
        callback(false);
      }
    },
  );
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

/** Infer the provider ('s1', 's2', or 's3') from a content/series ID prefix.
 * Handles both decoded ('s2:...') and URL-encoded ('s2%3A...') IDs. */
function inferProviderFromId(id: string): 's1' | 's2' | 's3' {
  try {
    const decoded = decodeURIComponent(id);
    if (decoded.startsWith('s3:')) return 's3';
    return decoded.startsWith('s2:') ? 's2' : 's1';
  } catch {
    if (id.startsWith('s3:')) return 's3';
    return id.startsWith('s2:') ? 's2' : 's1';
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

// Fetch progress via Socket.IO
interface ProgressSocketResponse {
  success: boolean;
  progress?: {
    progressSeconds: number;
    seasonNumber?: number;
    episodeNumber?: number;
    progressPercent: number;
  };
}

export function fetchContentProgress(
  contentId: string,
  callback: (progress: ContentProgress | null, hasProgress: boolean) => void,
): void {
  // Infer provider from contentId prefix so S2 records are correctly scoped.
  const providerId = inferProviderFromId(contentId);
  const socket = getSocket();
  if (!socket?.connected) {
    // If socket not connected, try HTTP fallback
    getContentProgress(contentId)
      .then((progress) => callback(progress, !!progress))
      .catch(() => callback(null, false));
    return;
  }

  socket.emit(
    'watch:get_progress',
    { contentId, providerId },
    (response: ProgressSocketResponse) => {
      let progress: ContentProgress | null = null;
      let hasProgress = false;

      if (
        response?.success &&
        response.progress &&
        response.progress.progressSeconds > 0
      ) {
        hasProgress = true;
        progress = {
          seasonNumber: response.progress.seasonNumber,
          episodeNumber: response.progress.episodeNumber,
          progressSeconds: response.progress.progressSeconds,
          progressPercent: response.progress.progressPercent,
        };
      }

      setProgressCache(contentId, progress, hasProgress);
      callback(progress, hasProgress);
    },
  );
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
