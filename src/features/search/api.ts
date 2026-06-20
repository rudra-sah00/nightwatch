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

/**
 * Fetch curated explore/home sections.
 */
export interface ExploreItem {
  id: string;
  title: string;
  genre: string;
  cover: string;
  backdrop: string | null;
  imdbRating: string | null;
  releaseDate: string;
  type: 'movie' | 'series';
}

export interface ExploreSection {
  title: string;
  items: ExploreItem[];
}

export interface ExploreData {
  banner: {
    title: string;
    image: string;
    detailPath: string;
    subjectId: string;
  }[];
  trending: ExploreItem[];
  sections: ExploreSection[];
}

export async function getExploreHome(): Promise<ExploreData | null> {
  try {
    return await apiFetch<ExploreData>('/api/video/explore/home');
  } catch {
    return null;
  }
}
