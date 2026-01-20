import { apiFetch } from '@/lib/fetch';

export async function getVideoDetails(id: string, options?: RequestInit) {
  return apiFetch(`/api/video/${id}`, options);
}

export async function getStreamUrl(id: string, options?: RequestInit) {
  return apiFetch(`/api/stream/${id}`, options);
}
