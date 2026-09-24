import { apiFetch } from '@/lib/fetch';
import { attempt } from './client';

/**
 * The watch-party relay's credential endpoint.
 *
 * Kept in `rest/` with the other wrappers rather than inside the relay hook, so the
 * relay's transport code has no idea how tokens are fetched and the `{ error }` folding
 * convention is not duplicated.
 *
 * @packageDocumentation
 */

export interface RelayTokenResponse {
  token?: string;
  /** Absolute expiry, ms epoch. */
  expiresAt?: number;
  /**
   * Validity in seconds.
   *
   * Prefer this over `expiresAt` when scheduling a refresh. Scheduling from `expiresAt`
   * compares the server's clock against this machine's, which is the same class of bug
   * the interpolation buffer has; a duration can be counted on a local timer instead.
   */
  ttlSeconds?: number;
  error?: string;
}

/**
 * Mint a relay connection token for a room.
 *
 * Scoped to that one room and short-lived, so a party outlives several of them and the
 * relay renews in place without dropping the connection. Refused for a member who is
 * only pending — presence on the relay is connection state, so a pending guest
 * connecting would put an avatar in the room before the host admitted them.
 */
export async function getRelayToken(
  roomId: string,
): Promise<RelayTokenResponse> {
  return attempt(
    () =>
      apiFetch<{ token: string; expiresAt: number; ttlSeconds: number }>(
        `/api/rooms/${roomId}/relay-token`,
      ),
    (data) => ({
      token: data.token,
      expiresAt: data.expiresAt,
      ttlSeconds: data.ttlSeconds,
    }),
  );
}
