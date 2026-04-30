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

  // When S1 (Netflix) is selected, search both S1 and PV (Prime Video) in parallel
  if (!server || server === 's1') {
    const [s1Results, pvResults] = await Promise.all([
      apiFetch<{ results: SearchResult[] }>(
        `/api/video/search?q=${encodeURIComponent(query)}&server=s1`,
        options,
      )
        .then(({ results }) =>
          results.map((r) => ({ ...r, provider: 's1' as const })),
        )
        .catch(() => [] as SearchResult[]),
      apiFetch<{ results: SearchResult[] }>(
        `/api/video/search?q=${encodeURIComponent(query)}&server=pv`,
        options,
      )
        .then(({ results }) =>
          results.map((r) => ({ ...r, provider: 'pv' as const })),
        )
        .catch(() => [] as SearchResult[]),
    ]);
    // Interleave: S1 first, then PV results that aren't duplicates by title
    const seen = new Set(s1Results.map((r) => r.title.toLowerCase()));
    const uniquePv = pvResults.filter((r) => !seen.has(r.title.toLowerCase()));
    const merged = [...s1Results, ...uniquePv];
    searchResultsCache.set(cacheKey, merged);
    return merged;
  }

  const serverParam = `&server=${encodeURIComponent(server)}`;
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
