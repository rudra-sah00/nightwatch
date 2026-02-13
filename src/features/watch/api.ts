import { apiFetch } from '@/lib/fetch';
import { getSocket } from '@/lib/socket';
import type { WatchProgress } from './types';

// ===== VIDEO DETAILS =====

export async function getVideoDetails(id: string, options?: RequestInit) {
  return apiFetch(`/api/video/${id}`, options);
}

export async function getStreamUrl(id: string, options?: RequestInit) {
  return apiFetch(`/api/stream/${id}`, options);
}

// ===== CONTINUE WATCHING =====

// Cache for continue watching items (30 seconds stale time)
interface ContinueWatchingCache {
  data: WatchProgress[];
  timestamp: number;
}
let continueWatchingCache: ContinueWatchingCache | null = null;
const CONTINUE_WATCHING_STALE_TIME = 30 * 1000;

// Invalidate continue watching cache (for real-time updates)
export function invalidateContinueWatchingCache(): void {
  continueWatchingCache = null;
}

// Check if cache is fresh
export function isContinueWatchingCacheFresh(): boolean {
  if (!continueWatchingCache) return false;
  return (
    Date.now() - continueWatchingCache.timestamp < CONTINUE_WATCHING_STALE_TIME
  );
}

// Get cached continue watching data
export function getCachedContinueWatching(): WatchProgress[] | null {
  if (isContinueWatchingCacheFresh()) {
    return continueWatchingCache?.data ?? null;
  }
  return null;
}

// Update continue watching cache
export function setContinueWatchingCache(data: WatchProgress[]): void {
  continueWatchingCache = { data, timestamp: Date.now() };
}

// Remove item from cache (optimistic update)
export function removeFromContinueWatchingCache(itemId: string): void {
  if (continueWatchingCache) {
    continueWatchingCache.data = continueWatchingCache.data.filter(
      (i) => i.id !== itemId,
    );
  }
}

// Fetch continue watching via HTTP (for SSR or fallback)
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

// Fetch continue watching via WebSocket
interface SocketResponse {
  success: boolean;
  items?: WatchProgress[];
  error?: string;
}

export function fetchContinueWatching(
  limit = 10,
  callback: (items: WatchProgress[] | null, error?: string) => void,
): void {
  const socket = getSocket();
  if (!socket?.connected) {
    // If socket not connected, try HTTP fallback
    getContinueWatching(limit)
      .then((items) => callback(items))
      .catch((err) => callback(null, err.message || 'Failed to load'));
    return;
  }

  socket.emit(
    'watch:get_continue_watching',
    { limit },
    (response: SocketResponse) => {
      if (response?.success && response.items) {
        setContinueWatchingCache(response.items);
        callback(response.items);
      } else {
        callback(null, response?.error || 'Failed to load');
      }
    },
  );
}

// Delete progress via WebSocket
export function deleteWatchProgress(
  progressId: string,
  callback: (success: boolean) => void,
): void {
  const socket = getSocket();
  if (!socket?.connected) {
    callback(false);
    return;
  }

  socket.emit(
    'watch:delete_progress',
    { progressId },
    (response: SocketResponse) => {
      if (response?.success) {
        removeFromContinueWatchingCache(progressId);
        callback(true);
      } else {
        callback(false);
      }
    },
  );
}

// ===== WATCH PROGRESS =====

// Cache for content progress (2 minutes TTL)
interface ProgressCacheEntry {
  progress: ContentProgress | null;
  hasProgress: boolean;
  expiry: number;
}

export interface ContentProgress {
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  progressSeconds: number;
  progressPercent: number;
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

// Fetch progress via WebSocket
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
    { contentId },
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

// ===== SPRITE VTT =====

export interface SpriteCue {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Parse VTT timestamp to seconds
function parseVttTime(timestamp: string): number {
  if (!timestamp) return 0;
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    return (
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseFloat(parts[2])
    );
  }
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(parts[0]);
}

// Cache for sprite VTT data
const spriteVttCache = new Map<string, SpriteCue[]>();

// Fetch and parse sprite VTT file
export async function fetchSpriteVtt(vttUrl: string): Promise<SpriteCue[]> {
  // Check cache first
  const cached = spriteVttCache.get(vttUrl);
  if (cached) {
    return cached;
  }

  const res = await fetch(vttUrl);
  if (!res.ok) throw new Error(`Failed to fetch sprite VTT: ${res.status}`);

  const text = await res.text();
  const sprites: SpriteCue[] = [];
  const lines = text.split('\n');
  let currentStart = 0;
  let currentEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const parts = line.split('-->');
      currentStart = parseVttTime(parts[0].trim());
      currentEnd = parseVttTime(parts[1].trim());
    } else if (line.includes('#xywh=')) {
      const [rawUrl, hash] = line.split('#xywh=');
      const coords = hash.split(',').map(Number);

      // Resolve relative URL against VTT URL base
      let absoluteUrl = rawUrl;
      try {
        if (!rawUrl.startsWith('http')) {
          absoluteUrl = new URL(rawUrl, vttUrl).toString();
        }
      } catch (_e) {
        // Fallback to original if resolution fails
      }

      if (coords.length === 4) {
        sprites.push({
          start: currentStart,
          end: currentEnd,
          url: absoluteUrl,
          x: coords[0],
          y: coords[1],
          w: coords[2],
          h: coords[3],
        });
      }
    }
  }

  // Cache the result
  spriteVttCache.set(vttUrl, sprites);

  // Preload unique images for instant hover
  const uniqueUrls = new Set(sprites.map((s) => s.url));
  uniqueUrls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });

  return sprites;
}
