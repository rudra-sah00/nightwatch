import { apiFetch } from '@/lib/fetch';
import type { Clip, ClipSegment, ClipsResponse } from './types';

export async function startClip(
  matchId: string,
  title: string,
  streamUrl: string,
): Promise<{ clipId: string }> {
  return apiFetch('/api/clips/start', {
    method: 'POST',
    body: JSON.stringify({ matchId, title, streamUrl }),
  });
}

export async function pushSegment(
  clipId: string,
  segment: ClipSegment,
): Promise<void> {
  await apiFetch(`/api/clips/${clipId}/segment`, {
    method: 'POST',
    body: JSON.stringify(segment),
  });
}

/**
 * Upload raw TS segment bytes (Server 1 — Electron fetches locally and uploads).
 */
export async function pushSegmentData(
  clipId: string,
  data: ArrayBuffer,
  startTime: number,
  duration: number,
): Promise<void> {
  await apiFetch(`/api/clips/${clipId}/segment-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-segment-start': String(startTime),
      'x-segment-duration': String(duration),
    },
    body: data,
  });
}

export async function finalizeClip(
  clipId: string,
): Promise<{ status: string }> {
  return apiFetch(`/api/clips/${clipId}/finalize`, { method: 'POST' });
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
