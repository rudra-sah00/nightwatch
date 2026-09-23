import { apiFetch } from '@/lib/fetch';
import type {
  PartyCreatePayload,
  RoomPreview,
  WatchPartyRoom,
} from '../../types';
import { attempt } from './client';

/**
 * Room existence, room detail and room creation.
 *
 * @packageDocumentation
 */

/**
 * Check whether a room exists, for the lobby.
 *
 * Returns a structured reason rather than throwing, because the lobby renders a
 * different message for each case: an ended party, a mistyped code, and a network
 * problem are three different things to tell someone.
 */
export async function checkRoomExists(roomId: string): Promise<{
  exists: boolean;
  preview?: RoomPreview;
  reason?: string;
  message?: string;
}> {
  try {
    const data = await apiFetch<{
      exists: boolean;
      title: string;
      type: 'movie' | 'series';
      season?: number;
      episode?: number;
      hostId?: string;
      hostName: string;
      memberCount: number;
      reason?: string;
      message?: string;
    }>(`/api/rooms/${roomId}/exists`);

    if (data.exists) {
      return {
        exists: true,
        preview: {
          id: roomId.toUpperCase(),
          title: data.title,
          type: data.type,
          season: data.season,
          episode: data.episode,
          hostId: data.hostId,
          hostName: data.hostName,
          memberCount: data.memberCount,
        },
      };
    }

    return {
      exists: false,
      reason: data.reason || 'not_found',
      message:
        data.message || 'This watch party has ended or the code is invalid.',
    };
  } catch (_error) {
    return {
      exists: false,
      reason: 'network_error',
      message: 'Unable to check room status. Please check your connection.',
    };
  }
}

/**
 * Get room details.
 *
 * Resolves to `null` rather than rejecting: several callers poll this while a join
 * is pending, where a 403 is the expected answer and not an error to surface.
 */
export async function getRoomDetails(
  roomId: string,
): Promise<WatchPartyRoom | null> {
  return apiFetch<WatchPartyRoom>(`/api/rooms/${roomId}`).catch(() => null);
}

/** Create a watch party room. */
export async function createPartyRoom(
  roomId: string,
  payload: PartyCreatePayload,
): Promise<{ room?: WatchPartyRoom; streamToken?: string; error?: string }> {
  return attempt(
    () =>
      apiFetch<{ room: WatchPartyRoom; streamToken: string }>(
        `/api/rooms/${roomId}/create`,
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    (data) => data,
  );
}
