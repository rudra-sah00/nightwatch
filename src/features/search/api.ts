import { apiFetch } from '@/lib/fetch';
import type {
  Episode,
  PlayResponse,
  SearchHistory,
  SearchResult,
  ShowDetails,
} from './types';

/**
 * Internal caching utilities for search requests.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Generic cache Map factory
function createCache<T>() {
  return new Map<string, CacheEntry<T>>();
}

// Cache cleanup utility
function cleanupCache<T>(cache: Map<string, CacheEntry<T>>, maxSize: number) {
  if (cache.size > maxSize) {
    const now = Date.now();
    for (const [key, value] of cache) {
      if (value.expiry < now) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Search history retrieval and management.
 */

// Search history cache (5 minutes)
const searchHistoryCache = createCache<SearchHistory[]>();
const SEARCH_HISTORY_CACHE_TTL = 5 * 60 * 1000;

export async function getSearchHistory(
  options?: RequestInit,
): Promise<SearchHistory[]> {
  const cacheKey = 'history';
  const cached = searchHistoryCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const { history } = await apiFetch<{ history: SearchHistory[] }>(
    '/api/video/history',
    options,
  );
  searchHistoryCache.set(cacheKey, {
    data: history,
    expiry: Date.now() + SEARCH_HISTORY_CACHE_TTL,
  });
  return history;
}

// Invalidate search history cache (call after search or delete)
export function invalidateSearchHistoryCache(): void {
  searchHistoryCache.clear();
}

export async function deleteSearchHistoryItem(
  id: string,
  options?: RequestInit,
): Promise<void> {
  await apiFetch(`/api/video/history/${id}`, {
    method: 'DELETE',
    ...options,
  });
  invalidateSearchHistoryCache();
}

export async function clearSearchHistory(options?: RequestInit): Promise<void> {
  await apiFetch('/api/video/history', {
    method: 'DELETE',
    ...options,
  });
  invalidateSearchHistoryCache();
}

/**
 * Content search with intelligent frontend caching.
 */

// Search results cache (5 minutes frontend, 15 minutes backend)
const searchResultsCache = createCache<SearchResult[]>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

export async function searchContent(
  query: string,
  server?: string,
  options?: RequestInit,
): Promise<SearchResult[]> {
  const normalizedQuery = `${query.toLowerCase().trim()}:${server || 'default'}`;
  const cached = searchResultsCache.get(normalizedQuery);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const serverParam = server ? `&server=${encodeURIComponent(server)}` : '';
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(query)}${serverParam}`,
    options,
  );

  searchResultsCache.set(normalizedQuery, {
    data: results,
    expiry: Date.now() + SEARCH_CACHE_TTL,
  });
  cleanupCache(searchResultsCache, 100);

  // Invalidate search history as new search was made
  invalidateSearchHistoryCache();

  return results;
}

/**
 * Get search suggestions with frontend caching.
 */
const searchSuggestionsCache = createCache<string[]>();
const SUGGEST_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getSearchSuggestions(
  query: string,
  server?: string,
  options?: RequestInit,
): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `${query.toLowerCase().trim()}:${server || 'default'}`;
  const cached = searchSuggestionsCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const serverParam = server ? `&server=${encodeURIComponent(server)}` : '';
  const { suggestions } = await apiFetch<{ suggestions: string[] }>(
    `/api/video/search/suggest?q=${encodeURIComponent(query)}${serverParam}`,
    options,
  );

  searchSuggestionsCache.set(cacheKey, {
    data: suggestions,
    expiry: Date.now() + SUGGEST_CACHE_TTL,
  });
  cleanupCache(searchSuggestionsCache, 50);

  return suggestions;
}

/**
 * Metadata retrieval for movies and series.
 */

// Show details cache (5 minutes)
const showDetailsCache = createCache<ShowDetails>();
const SHOW_CACHE_TTL = 5 * 60 * 1000;

export async function getShowDetails(
  id: string,
  options?: RequestInit,
): Promise<ShowDetails> {
  const cached = showDetailsCache.get(id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const { show } = await apiFetch<{ show: ShowDetails }>(
    `/api/video/show/${id}`,
    options,
  );
  showDetailsCache.set(id, { data: show, expiry: Date.now() + SHOW_CACHE_TTL });
  cleanupCache(showDetailsCache, 50);

  return show;
}

/**
 * Episode listing for series, with caching to minimize large requests.
 */

// Episodes cache (10 minutes - episodes rarely change)
const episodesCache = createCache<{
  episodes: Episode[];
  totalEpisodes: number;
}>();
const EPISODES_CACHE_TTL = 10 * 60 * 1000;

export async function getSeriesEpisodes(
  seriesId: string,
  startSeasonId?: string,
  options?: RequestInit,
): Promise<{ episodes: Episode[]; totalEpisodes: number }> {
  const cacheKey = startSeasonId
    ? `${seriesId}:${startSeasonId}`
    : `${seriesId}:all`;
  const cached = episodesCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  const result = await apiFetch<{ episodes: Episode[]; totalEpisodes: number }>(
    url,
    options,
  );

  episodesCache.set(cacheKey, {
    data: result,
    expiry: Date.now() + EPISODES_CACHE_TTL,
  });
  cleanupCache(episodesCache, 30);

  return result;
}

/**
 * Video playback trigger and status monitoring.
 * Note: Playback triggers external automation which may take 30+ seconds.
 */

export interface PlayMovieParams {
  type: 'movie';
  title: string;
  movieId?: string;
  duration?: number; // Duration in seconds for smart caching
  server?: string;
}

export interface PlaySeriesParams {
  type: 'series';
  title: string;
  seriesId?: string;
  season: number;
  episode: number;
  duration?: number; // Duration in seconds for smart caching
  server?: string;
}

export type PlayParams = PlayMovieParams | PlaySeriesParams;

export async function playVideo(
  params: PlayParams,
  options?: RequestInit,
): Promise<PlayResponse> {
  // Longer timeout since Playwright automation takes ~30+ seconds
  return apiFetch<PlayResponse>('/api/video/play', {
    method: 'POST',
    body: JSON.stringify(params),
    timeout: 120000,
    ...options,
  });
}

/**
 * Notify the backend that this client has stopped playback so it can
 * immediately remove the Redis stream session.  Uses sendBeacon so the
 * request survives page-unload and does not block navigation.
 *
 * Falls back to a fire-and-forget fetch when sendBeacon is unavailable
 * (e.g. in Node/test environments).
 */
export function stopVideo(): void {
  const url = '/api/video/stop';
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    // Non-blocking fallback
    fetch(url, { method: 'POST', keepalive: true }).catch(() => undefined);
  }
}
