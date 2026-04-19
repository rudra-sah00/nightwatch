import { createTTLCache } from '@/lib/cache';
import { apiFetch } from '@/lib/fetch';
import type { Episode, SearchResult, ShowDetails } from './types';

/**
 * Content search with intelligent frontend caching.
 */

const searchResultsCache = createTTLCache<SearchResult[]>(5 * 60 * 1000, 100);

export async function searchContent(
  query: string,
  server?: string,
  options?: RequestInit,
): Promise<SearchResult[]> {
  const cacheKey = `${query.toLowerCase().trim()}:${server || 'default'}`;
  const cached = searchResultsCache.get(cacheKey);
  if (cached) return cached;

  const serverParam = server ? `&server=${encodeURIComponent(server)}` : '';
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(query)}${serverParam}`,
    options,
  );

  searchResultsCache.set(cacheKey, results);
  return results;
}

/**
 * Get search suggestions with frontend caching.
 */
const searchSuggestionsCache = createTTLCache<string[]>(10 * 60 * 1000, 50);

export async function getSearchSuggestions(
  query: string,
  server?: string,
  options?: RequestInit,
): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `${query.toLowerCase()}:${server || 'default'}`;
  const cached = searchSuggestionsCache.get(cacheKey);
  if (cached) return cached;

  const serverParam = server ? `&server=${encodeURIComponent(server)}` : '';
  const { suggestions } = await apiFetch<{ suggestions: string[] }>(
    `/api/video/search/suggest?q=${encodeURIComponent(query)}${serverParam}`,
    options,
  );

  searchSuggestionsCache.set(cacheKey, suggestions);
  return suggestions;
}

/**
 * Metadata retrieval for movies and series.
 */

const showDetailsCache = createTTLCache<ShowDetails>(5 * 60 * 1000, 50);

export async function getShowDetails(
  id: string,
  options?: RequestInit,
): Promise<ShowDetails> {
  const cached = showDetailsCache.get(id);
  if (cached) return cached;

  const { show } = await apiFetch<{ show: ShowDetails }>(
    `/api/video/show/${id}`,
    options,
  );
  showDetailsCache.set(id, show);
  return show;
}

/**
 * Episode listing for series, with caching to minimize large requests.
 */

const episodesCache = createTTLCache<{
  episodes: Episode[];
  totalEpisodes: number;
}>(10 * 60 * 1000, 30);

export async function getSeriesEpisodes(
  seriesId: string,
  startSeasonId?: string,
  options?: RequestInit,
): Promise<{ episodes: Episode[]; totalEpisodes: number }> {
  const cacheKey = startSeasonId
    ? `${seriesId}:${startSeasonId}`
    : `${seriesId}:all`;
  const cached = episodesCache.get(cacheKey);
  if (cached) return cached;

  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  const result = await apiFetch<{ episodes: Episode[]; totalEpisodes: number }>(
    url,
    options,
  );

  episodesCache.set(cacheKey, result);
  return result;
}

// Metadata retrieval for movies and series... (keeping getSeriesEpisodes)
