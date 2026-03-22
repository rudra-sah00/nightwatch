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
 */

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

// Parse a backend CDN proxy URL → { token, originalCdnUrl }
// Format: /api/stream/cdn/TOKEN/BASE64_URL_MODIFIED
function parseProxyCdnUrl(
  url: string,
): { token: string; cdnUrl: string } | null {
  // Handle both absolute (https://...) and relative (/api/...) proxy URLs
  const m = url.match(/\/api\/stream\/cdn\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  try {
    // Reverse wrapInProxy's base64url encoding
    const encoded = m[2].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (encoded.length % 4)) % 4;
    const cdnUrl = atob(encoded + '='.repeat(pad));
    return { token: m[1], cdnUrl };
  } catch {
    return null;
  }
}

// Wrap an external URL in the CDN proxy (mirrors frontend wrapInProxy utility)
function proxyCdnImage(rawUrl: string, token: string): string {
  if (
    !rawUrl ||
    rawUrl.startsWith('data:') ||
    rawUrl.includes('/api/stream/cdn')
  ) {
    return rawUrl;
  }
  const encoded = btoa(rawUrl)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `/api/stream/cdn/${token}/${encoded}`;
}

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

  // If the VTT is served via the backend CDN proxy, extract token + original URL.
  // We need the original CDN URL to correctly resolve relative image paths inside
  // the VTT (resolving against the proxy URL would yield a broken path), and also
  // to proxy the sprite images through the backend so CDN Referer restrictions
  // don't prevent the browser from loading them.
  const proxyInfo = parseProxyCdnUrl(vttUrl);

  const preloadedUrls = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const parts = line.split('-->');
      currentStart = parseVttTime(parts[0].trim());
      currentEnd = parseVttTime(parts[1].trim());
    } else if (line.includes('#xywh=')) {
      const [rawUrl, hash] = line.split('#xywh=');
      const coords = hash.split(',').map(Number);

      // Resolve relative URL against the ACTUAL CDN URL (not the proxy URL).
      // Resolving against the proxy URL produces paths like
      // /api/stream/cdn/TOKEN/sprites.jpg which the backend can't decode.
      let absoluteUrl = rawUrl.trim();
      if (!absoluteUrl.startsWith('http')) {
        const base = proxyInfo?.cdnUrl ?? vttUrl;
        try {
          absoluteUrl = new URL(absoluteUrl, base).toString();
        } catch {
          // keep as-is if resolution fails
        }
      }

      // Proxy every image URL through the backend so the backend can add the
      // correct Referer / auth headers that the CDN requires.
      // CSS background-image doesn't support custom headers, so direct CDN
      // access would be rejected by Referer-protected CDNs.
      if (proxyInfo && absoluteUrl.startsWith('http')) {
        absoluteUrl = proxyCdnImage(absoluteUrl, proxyInfo.token);
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

        // Preload unique images for instant hover - combined iteration (Rule 7.6)
        if (!preloadedUrls.has(absoluteUrl)) {
          preloadedUrls.add(absoluteUrl);
          const img = new Image();
          img.src = absoluteUrl;
        }
      }
    }
  }

  spriteVttCache.set(vttUrl, sprites);
  return sprites;
}

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
