import { apiFetch } from '@/lib/fetch';
import type { Episode, PlayResponse, SearchHistory, SearchResult, ShowDetails } from './types';

// ===== SEARCH HISTORY =====

export async function getSearchHistory(): Promise<SearchHistory[]> {
  const { history } = await apiFetch<{ history: SearchHistory[] }>('/api/video/history');
  return history;
}

export async function deleteSearchHistoryItem(id: string): Promise<void> {
  await apiFetch(`/api/video/history/${id}`, {
    method: 'DELETE',
  });
}

export async function clearSearchHistory(): Promise<void> {
  await apiFetch('/api/video/history', {
    method: 'DELETE',
  });
}

// ===== SEARCH CONTENT =====

export async function searchContent(query: string): Promise<SearchResult[]> {
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/video/search?q=${encodeURIComponent(query)}`,
  );
  return results;
}

// ===== SHOW DETAILS =====

export async function getShowDetails(id: string): Promise<ShowDetails> {
  const { show } = await apiFetch<{ show: ShowDetails }>(`/api/video/show/${id}`);
  return show;
}

// ===== EPISODES =====

export async function getSeriesEpisodes(
  seriesId: string,
  startSeasonId?: string,
): Promise<{ episodes: Episode[]; totalEpisodes: number }> {
  const url = startSeasonId
    ? `/api/video/episodes/${seriesId}?start_season_id=${startSeasonId}`
    : `/api/video/episodes/${seriesId}`;
  return apiFetch(url);
}

// ===== PLAY VIDEO =====

export interface PlayMovieParams {
  type: 'movie';
  title: string;
}

export interface PlaySeriesParams {
  type: 'series';
  title: string;
  season: number;
  episode: number;
}

export type PlayParams = PlayMovieParams | PlaySeriesParams;

export async function playVideo(params: PlayParams): Promise<PlayResponse> {
  // Longer timeout since Playwright automation takes ~30+ seconds
  return apiFetch<PlayResponse>('/api/video/play', {
    method: 'POST',
    body: JSON.stringify(params),
    timeout: 120000,
  });
}

export async function getPlayStatus(): Promise<{
  status: string;
  queueLength: number;
  isProcessing: boolean;
}> {
  return apiFetch('/api/video/play/status');
}
