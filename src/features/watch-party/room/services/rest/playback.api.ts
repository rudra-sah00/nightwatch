import { apiFetch } from '@/lib/fetch';
import type { WatchPartyRoom } from '../../types';
import { attempt, postForSuccess } from './client';

/**
 * Playback state, content switches and the shared stream token.
 *
 * @packageDocumentation
 */

/**
 * Persist playback state (host only).
 *
 * RTM is what actually keeps members in sync; this write is what a member who
 * joins or reconnects later reads, so it must happen on every host event even
 * though nobody is waiting on the response.
 */
export function syncPartyState(
  roomId: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  return postForSuccess(`/api/rooms/${roomId}/state`, payload);
}

/**
 * Switch what the party is watching (host only).
 *
 * `contentId` is worth sending even though the server can resolve an episode from
 * title plus season and episode: it is what the room is keyed on downstream (clip
 * recording, a rejoining member's playlist lookup), and a switch that omits it
 * leaves the server to preserve the old one rather than state the new one.
 */
export async function updatePartyContent(
  roomId: string,
  payload: {
    contentId?: string;
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  },
): Promise<{ room?: WatchPartyRoom; error?: string }> {
  return attempt(
    () =>
      apiFetch<{ room: WatchPartyRoom }>(`/api/rooms/${roomId}/content`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    (data) => ({ room: data.room }),
  );
}

/**
 * Get the party's shared stream token.
 *
 * For live TV this returns the `LIVESTREAM` sentinel rather than a real token —
 * `normalizeRoomUrls` checks the room type and does not inject it, because
 * injecting a token into an upstream IPTV URL rewrites its path and 404s.
 */
export async function getPartyStreamToken(
  roomId: string,
): Promise<{ token?: string; error?: string }> {
  return attempt(
    () => apiFetch<{ token: string }>(`/api/rooms/${roomId}/stream-token`),
    (data) => ({ token: data.token }),
  );
}
