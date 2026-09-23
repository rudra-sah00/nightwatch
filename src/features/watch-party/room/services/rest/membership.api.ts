import { apiFetch } from '@/lib/fetch';
import type {
  PartyJoinRequestPayload,
  RoomMember,
  WatchPartyRoom,
} from '../../types';
import { attempt, postForSuccess } from './client';

/**
 * Joining, host decisions on join requests, and leaving.
 *
 * @packageDocumentation
 */

/**
 * Request to join a watch party room.
 *
 * Two shapes come back: `{ status: 'pending', guestToken }` for anyone awaiting
 * approval, or `{ room }` when the caller is admitted straight away (the host, or
 * an existing member reloading).
 */
export async function requestJoinPartyRoom(
  roomId: string,
  payload: PartyJoinRequestPayload,
): Promise<{
  status?: 'pending';
  room?: WatchPartyRoom;
  guestToken?: string;
  streamToken?: string;
  error?: string;
}> {
  return attempt(
    () =>
      apiFetch<Record<string, unknown>>(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    (data) => data,
  );
}

/** Approve a join request (host only). */
export function approveJoinRequest(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  return postForSuccess(`/api/rooms/${roomId}/approve`, { memberId });
}

/** Reject a join request (host only). */
export function rejectJoinRequest(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  return postForSuccess(`/api/rooms/${roomId}/reject`, { memberId });
}

/** Remove an active member (host only). */
export function kickMember(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  return postForSuccess(`/api/rooms/${roomId}/kick`, { memberId });
}

/**
 * Leave the current watch party.
 *
 * The guest token is sent in the body as well as the `Authorization` header that
 * `apiFetch` adds, because a guest leaving may already have had its session
 * cleared and the backend identifies them from whichever arrives.
 */
export function leavePartyRoom(
  roomId: string,
): Promise<{ success: boolean; error?: string }> {
  const guestToken =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('guest_token')
      : undefined;
  return postForSuccess(
    `/api/rooms/${roomId}/leave`,
    guestToken ? { guestId: guestToken } : undefined,
  );
}

/** Fetch pending join requests (host only). */
export async function fetchPendingRequests(roomId: string): Promise<{
  pendingMembers?: Pick<
    RoomMember,
    'id' | 'name' | 'profilePhoto' | 'isHost' | 'joinedAt'
  >[];
  error?: string;
}> {
  return attempt(
    () =>
      apiFetch<{
        pendingMembers: Pick<
          RoomMember,
          'id' | 'name' | 'profilePhoto' | 'isHost' | 'joinedAt'
        >[];
      }>(`/api/rooms/${roomId}/pending`),
    (data) => ({ pendingMembers: data.pendingMembers }),
  );
}
