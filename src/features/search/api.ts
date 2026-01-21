import { apiFetch } from '@/lib/fetch';
import type { Episode, PlayResponse, SearchHistory, SearchResult, ShowDetails } from './types';

// ===== SEARCH HISTORY =====

export async function getSearchHistory(options?: RequestInit): Promise<SearchHistory[]> {
  const { history } = await apiFetch<{ history: SearchHistory[] }>('/api/video/history', options);
  return history;
}

export async function deleteSearchHistoryItem(id: string, options?: RequestInit): Promise<void> {
  await apiFetch(`/api/video/history/${id}`, {
    method: 'DELETE',
    ...options,
  });
}

export async function clearSearchHistory(options?: RequestInit): Promise<void> {
  await apiFetch('/api/video/history', {
    method: 'DELETE',
    ...options,
  });
}

// ===== SEARCH CONTENT =====

export async function searchContent(query: string, options?: RequestInit): Promise<SearchResult[]> {
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(query)}`,
    options,
  );
  return results;
}

// ===== SHOW DETAILS =====

export async function getShowDetails(id: string, options?: RequestInit): Promise<ShowDetails> {
  const { show } = await apiFetch<{ show: ShowDetails }>(`/api/video/show/${id}`, options);
  return show;
}

// ===== EPISODES =====

export async function getSeriesEpisodes(
  seriesId: string,
  startSeasonId?: string,
  options?: RequestInit,
): Promise<{ episodes: Episode[]; totalEpisodes: number }> {
  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  return apiFetch(url, options);
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
