import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import type { Episode, SearchResult, ShowDetails } from './types';

/**
 * Content search — TanStack Query handles caching.
 */
export async function searchContent(
  query: string,
  options?: RequestInit,
): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  trackEvent('search', { query: normalizedQuery });

  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(normalizedQuery)}`,
    options,
  );

  if (results.length === 0)
    trackEvent('search_no_results', { query: normalizedQuery });
  return results;
}

/**
 * Get search suggestions.
 */
export async function getSearchSuggestions(
  query: string,
  options?: RequestInit,
): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const { suggestions } = await apiFetch<{ suggestions: string[] }>(
    `/api/video/search/suggest?q=${encodeURIComponent(query)}`,
    options,
  );

  return suggestions;
}

/**
 * Metadata retrieval for movies and series.
 */
export async function getShowDetails(
  id: string,
  options?: RequestInit,
): Promise<ShowDetails> {
  const { show } = await apiFetch<{ show: ShowDetails }>(
    `/api/video/show/${id}`,
    options,
  );
  return show;
}

/**
 * Episode listing for series.
 */
export async function getSeriesEpisodes(
  seriesId: string,
  startSeasonId?: string,
  options?: RequestInit,
): Promise<{ episodes: Episode[]; totalEpisodes: number }> {
  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  return apiFetch<{ episodes: Episode[]; totalEpisodes: number }>(url, options);
}
