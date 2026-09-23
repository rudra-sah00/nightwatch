import { apiFetch } from '@/lib/fetch';
import type { WatchPartyRoom } from '../../types';
import { attempt } from './client';

/**
 * Who may chat, draw and play sounds.
 *
 * @packageDocumentation
 */

/** Update the room-wide permission defaults (host only). */
export async function updatePartyPermissions(
  roomId: string,
  permissions: Partial<WatchPartyRoom['permissions']>,
): Promise<{ permissions?: WatchPartyRoom['permissions']; error?: string }> {
  return attempt(
    () =>
      apiFetch<{ permissions: WatchPartyRoom['permissions'] }>(
        `/api/rooms/${roomId}/permissions`,
        { method: 'POST', body: JSON.stringify({ permissions }) },
      ),
    (data) => ({ permissions: data.permissions }),
  );
}

/**
 * Override permissions for one member (host only).
 *
 * A member override wins over the room default, which is how a host mutes one
 * person without closing chat for everybody.
 */
export async function updateMemberPermissions(
  roomId: string,
  memberId: string,
  permissions: Record<string, unknown>,
): Promise<{
  memberId?: string;
  permissions?: Record<string, unknown>;
  error?: string;
}> {
  return attempt(
    () =>
      apiFetch<Record<string, unknown>>(
        `/api/rooms/${roomId}/members/${memberId}/permissions`,
        { method: 'POST', body: JSON.stringify({ permissions }) },
      ),
    (data) => data,
  );
}
