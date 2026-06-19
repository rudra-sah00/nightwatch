import { apiFetch } from '@/lib/fetch';
import type { Clip, ClipsResponse } from './types';

export async function startServerClip(
  streamToken: string | null,
  streamUrl: string | null,
  matchId: string,
  title: string,
  startTime: number,
): Promise<{ clipId: string }> {
  return apiFetch('/api/clips/start-server-clip', {
    method: 'POST',
    body: JSON.stringify({ streamToken, streamUrl, matchId, title, startTime }),
  });
}

export async function stopServerClip(
  clipId: string,
  endTime: number,
): Promise<{ status: string }> {
  return apiFetch(`/api/clips/${clipId}/stop-server-clip`, {
    method: 'POST',
    body: JSON.stringify({ endTime }),
  });
}

export interface ClipFilters {
  search?: string;
  sort?: 'newest' | 'oldest' | 'longest' | 'shortest';
  dateFrom?: string;
  dateTo?: string;
}

export async function getClips(
  page = 1,
  limit = 12,
  filters?: ClipFilters,
  options?: RequestInit,
): Promise<ClipsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);

  return apiFetch<ClipsResponse>(`/api/clips?${params}`, options);
}

export async function deleteClip(clipId: string): Promise<void> {
  await apiFetch(`/api/clips/${clipId}`, { method: 'DELETE' });
}

export async function renameClip(clipId: string, title: string): Promise<void> {
  await apiFetch(`/api/clips/${clipId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function toggleClipPublic(
  clipId: string,
): Promise<{ isPublic: boolean; shareId: string | null }> {
  return apiFetch(`/api/clips/${clipId}/toggle-public`, { method: 'POST' });
}

export async function getPublicClip(shareId: string): Promise<Clip> {
  return apiFetch<Clip>(`/api/clips/public/${shareId}`);
}

/**
 * Save a scene capture screenshot to the clips library.
 */
export async function saveScreenshot(
  image: string,
  title: string,
): Promise<void> {
  await apiFetch('/api/clips/screenshot', {
    method: 'POST',
    body: JSON.stringify({ image, title }),
  });
}
