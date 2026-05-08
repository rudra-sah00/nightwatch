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
    // Deduplicate by title, then sort by relevance to query
    const seen = new Set<string>();
    const all = [...s1Results, ...pvResults].filter((r) => {
      const key = r.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const q = query.toLowerCase().trim();
    all.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aExact = aTitle === q ? 0 : 1;
      const bExact = bTitle === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = aTitle.startsWith(q) ? 0 : 1;
      const bStarts = bTitle.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aIncludes = aTitle.includes(q) ? 0 : 1;
      const bIncludes = bTitle.includes(q) ? 0 : 1;
      return aIncludes - bIncludes;
    });
    searchResultsCache.set(cacheKey, all);
    return all;
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

// In-flight dedup: if the same content is requested while a fetch is pending,
// reuse the existing promise instead of firing a second API call.
const showDetailsInflight = new Map<string, Promise<ShowDetails>>();

export async function getShowDetails(
  id: string,
  options?: RequestInit,
): Promise<ShowDetails> {
  const cached = showDetailsCache.get(id);
  if (cached) return cached;

  const inflight = showDetailsInflight.get(id);
  if (inflight) return inflight;

  const promise = apiFetch<{ show: ShowDetails }>(
    `/api/video/show/${id}`,
    options,
  )
    .then(({ show }) => {
      showDetailsCache.set(id, show);
      showDetailsInflight.delete(id);
      return show;
    })
    .catch((err) => {
      showDetailsInflight.delete(id);
      throw err;
    });

  showDetailsInflight.set(id, promise);
  return promise;
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
