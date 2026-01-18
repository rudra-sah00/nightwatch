/**
 * Watch Progress API service - Continue Watching feature
 */

import { apiRequest } from './client';

// Types
export interface ContinueWatchingItem {
  id: string;
  content_id: string;
  content_type: 'Movie' | 'Series';
  title: string;
  poster_url: string | null;
  episode_id: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_title: string | null;
  progress_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  remaining_seconds: number;
  remaining_minutes: number;
  last_watched_at: string;
}

export interface ContinueWatchingResponse {
  items: ContinueWatchingItem[];
  total_count: number;
}

export interface UpdateWatchProgressRequest {
  content_id: string;
  content_type: 'Movie' | 'Series';
  title: string;
  poster_url?: string;
  episode_id?: string;
  season_number?: number;
  episode_number?: number;
  episode_title?: string;
  progress_seconds: number;
  duration_seconds: number;
}

export interface ContentProgress {
  progress: ContinueWatchingItem | null;
}

/**
 * Helper to unwrap API response
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest<T>(endpoint, options);
  if (response.error) {
    throw new Error(response.error);
  }
  if (!response.data) {
    throw new Error('No data returned');
  }
  return response.data;
}

/**
 * Get continue watching list
 */
export async function getContinueWatching(
  limit = 20,
  offset = 0
): Promise<ContinueWatchingResponse> {
  return request<ContinueWatchingResponse>(
    `/api/user/continue-watching?limit=${limit}&offset=${offset}`
  );
}

/**
 * Update watch progress (called while video is playing)
 */
export async function updateWatchProgress(
  data: UpdateWatchProgressRequest
): Promise<{ success: boolean; progress: ContinueWatchingItem }> {
  return request<{ success: boolean; progress: ContinueWatchingItem }>('/api/user/watch-progress', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get progress for specific content
 */
export async function getContentProgress(
  contentId: string,
  episodeId?: string
): Promise<ContentProgress> {
  const url = episodeId
    ? `/api/user/watch-progress/${contentId}/${episodeId}`
    : `/api/user/watch-progress/${contentId}`;
  return request<ContentProgress>(url);
}

/**
 * Remove item from continue watching
 */
export async function removeFromContinueWatching(
  progressId: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/user/watch-progress/${progressId}`, {
    method: 'DELETE',
  });
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m left`;
  }
  return `${minutes}m left`;
}

/**
 * Format progress time for display (e.g., "1:23:45")
 */
export function formatProgressTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
