import { apiFetch } from '@/lib/fetch';
import type { Episode, PlayResponse, SearchHistory, SearchResult, ShowDetails } from './types';

// ===== CACHE UTILITIES =====

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

// ===== SEARCH HISTORY =====

// Search history cache (5 minutes)
const searchHistoryCache = createCache<SearchHistory[]>();
const SEARCH_HISTORY_CACHE_TTL = 5 * 60 * 1000;

export async function getSearchHistory(options?: RequestInit): Promise<SearchHistory[]> {
  const cacheKey = 'history';
  const cached = searchHistoryCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const { history } = await apiFetch<{ history: SearchHistory[] }>('/api/video/history', options);
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

export async function deleteSearchHistoryItem(id: string, options?: RequestInit): Promise<void> {
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

// ===== SEARCH CONTENT =====

// Search results cache (5 minutes frontend, 15 minutes backend)
const searchResultsCache = createCache<SearchResult[]>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

export async function searchContent(query: string, options?: RequestInit): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = searchResultsCache.get(normalizedQuery);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(query)}`,
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

// ===== SHOW DETAILS =====

// Show details cache (5 minutes)
const showDetailsCache = createCache<ShowDetails>();
const SHOW_CACHE_TTL = 5 * 60 * 1000;

export async function getShowDetails(id: string, options?: RequestInit): Promise<ShowDetails> {
  const cached = showDetailsCache.get(id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const { show } = await apiFetch<{ show: ShowDetails }>(`/api/video/show/${id}`, options);
  showDetailsCache.set(id, { data: show, expiry: Date.now() + SHOW_CACHE_TTL });
  cleanupCache(showDetailsCache, 50);

  return show;
}

export function clearShowDetailsCache(id?: string): void {
  if (id) {
    showDetailsCache.delete(id);
  } else {
    showDetailsCache.clear();
  }
}

// ===== EPISODES =====

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
  const cacheKey = startSeasonId ? `${seriesId}:${startSeasonId}` : `${seriesId}:all`;
  const cached = episodesCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  const result = await apiFetch<{ episodes: Episode[]; totalEpisodes: number }>(url, options);

  episodesCache.set(cacheKey, {
    data: result,
    expiry: Date.now() + EPISODES_CACHE_TTL,
  });
  cleanupCache(episodesCache, 30);

  return result;
}

export function clearEpisodesCache(seriesId?: string): void {
  if (seriesId) {
    // Clear all entries for this series
    for (const key of episodesCache.keys()) {
      if (key.startsWith(seriesId)) {
        episodesCache.delete(key);
      }
    }
  } else {
    episodesCache.clear();
  }
}

// ===== PLAY VIDEO =====

export interface PlayMovieParams {
  type: 'movie';
  title: string;
  duration?: number; // Duration in seconds for smart caching
}

export interface PlaySeriesParams {
  type: 'series';
  title: string;
  season: number;
  episode: number;
  duration?: number; // Duration in seconds for smart caching
}

export type PlayParams = PlayMovieParams | PlaySeriesParams;

export async function playVideo(params: PlayParams, options?: RequestInit): Promise<PlayResponse> {
  // Longer timeout since Playwright automation takes ~30+ seconds
  return apiFetch<PlayResponse>('/api/video/play', {
    method: 'POST',
    body: JSON.stringify(params),
    timeout: 120000,
    ...options,
  });
}

export async function getPlayStatus(): Promise<{
  status: string;
  queueLength: number;
  isProcessing: boolean;
}> {
  return apiFetch('/api/video/play/status');
}
