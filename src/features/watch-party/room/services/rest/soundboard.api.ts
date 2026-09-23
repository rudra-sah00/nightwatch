import { apiFetch } from '@/lib/fetch';

/**
 * Soundboard catalogue.
 *
 * Not room-scoped — the catalogue is global and the party only broadcasts which
 * sound to play. It lives alongside the room services because the soundboard panel
 * is part of the party sidebar and nothing else consumes it.
 *
 * @packageDocumentation
 */

/** One playable sound. */
export interface SoundItem {
  name: string;
  slug: string;
  sound: string;
  color: string;
}

/** A page of sounds. `next` is null on the last page, which ends infinite scroll. */
export interface SoundboardResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SoundItem[];
}

/** Fetch trending sounds. Throws — the panel has its own error state. */
export async function getTrendingSounds(page = 1): Promise<SoundboardResponse> {
  return apiFetch<SoundboardResponse>(`/api/soundboard?page=${page}`);
}

/** Search sounds by name. */
export async function searchSounds(
  query: string,
  page = 1,
): Promise<SoundboardResponse> {
  return apiFetch<SoundboardResponse>(
    `/api/soundboard/search?q=${encodeURIComponent(query)}&page=${page}`,
  );
}
