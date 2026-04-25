import { apiFetch } from '@/lib/fetch';
import type { ClipSegment, ClipsResponse } from './types';

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

export async function finalizeClip(
  clipId: string,
): Promise<{ status: string }> {
  return apiFetch(`/api/clips/${clipId}/finalize`, { method: 'POST' });
}

export async function getClips(
  page = 1,
  limit = 20,
  options?: RequestInit,
): Promise<ClipsResponse> {
  return apiFetch<ClipsResponse>(
    `/api/clips?page=${page}&limit=${limit}`,
    options,
  );
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
