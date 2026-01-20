import { apiFetch } from '@/lib/fetch';

export async function getVideoDetails(id: string) {
  return apiFetch(`/api/video/${id}`);
}

export async function getStreamUrl(id: string) {
  return apiFetch(`/api/stream/${id}`);
}
