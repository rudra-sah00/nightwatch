import { toast } from 'sonner';
import type { MemberInfo } from './agora-types';

/**
 * Pure helpers for the Agora RTC engine.
 *
 * Deliberately free of React and of the SDK, so they can be unit tested directly —
 * `generateNumericUid` in particular MUST agree with the backend byte for byte, and
 * that is worth asserting without standing up a client.
 *
 * @packageDocumentation
 */

/**
 * Deterministic numeric UID from a string userId.
 *
 * Agora channels identify users by a 32-bit integer, not a string, so both ends
 * derive one from the user id. This must match the backend's `generateNumericUid`
 * in `agora.service.ts` exactly — if they disagree, the token is minted for one
 * uid and the client joins as another, and the join is rejected.
 */
export function generateNumericUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Ensure 32-bit unsigned integer (0 to 4,294,967,295) and non-zero
  return hash >>> 0 || 1;
}

/**
 * Build a map from Agora numeric UID → member info.
 *
 * This is the only way back from a channel participant to a real user: the UID is
 * a one-way hash, so the roster is inverted rather than the hash.
 */
export function buildUidToMemberMap(
  members: MemberInfo[],
): Map<string, MemberInfo> {
  const map = new Map<string, MemberInfo>();
  for (const m of members) {
    map.set(String(generateNumericUid(m.id)), m);
  }
  return map;
}

/**
 * Turn a media-device error into a toast the user can act on.
 *
 * The three cases need different words: a denied permission is fixed in browser
 * settings, a missing device by plugging one in, and anything else is ours.
 *
 * @param error - Whatever the SDK or `getUserMedia` threw.
 * @param deviceType - Which device was being opened.
 * @param t - Translator scoped to the party toast namespace.
 */
export function handleDeviceError(
  error: unknown,
  deviceType: 'Microphone' | 'Camera',
  t: (key: string, params?: Record<string, string>) => string,
) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Permission') || message.includes('NotAllowed')) {
    toast.error(t('permissionDenied', { device: deviceType }));
  } else if (
    message.includes('NotFound') ||
    message.includes('Device not found')
  ) {
    toast.error(t('deviceNotFound', { device: deviceType.toLowerCase() }));
  } else {
    toast.error(t('deviceAccessFailed', { device: deviceType.toLowerCase() }));
  }
}
