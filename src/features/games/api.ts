import { apiFetch } from '@/lib/fetch';
import type { Game } from './types';

export type { Game } from './types';

/**
 * Fetch the full list of available games.
 */
export async function getGames(): Promise<Game[]> {
  const data = await apiFetch<{ games: Game[] }>('/api/games');
  return data.games ?? [];
}

/**
 * Fetch the authenticated game iframe URL for a specific game.
 */
export async function getGameUrl(slug: string): Promise<string> {
  const data = await apiFetch<{ url: string }>(`/api/games/${slug}/url`);
  return data.url;
}

/**
 * Refresh the game auth cookie (heartbeat during long sessions).
 */
export async function refreshGameSession(slug: string): Promise<void> {
  await apiFetch(`/api/games/${slug}/url`);
}
