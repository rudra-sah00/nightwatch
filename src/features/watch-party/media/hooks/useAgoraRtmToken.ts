'use client';

import { useEffect, useState } from 'react';
import { getAgoraRtmToken } from '../services/agora.api';

interface UseAgoraRtmTokenOptions {
  /** Room code — channel name for the RTM token */
  roomId: string | undefined;
  /** Current user's ID */
  userId: string | undefined;
  /** Current user's display name */
  userName: string | undefined;
  /** Optional pre-fetched token data for instant join */
  initialTokenData?: {
    token: string;
    appId: string;
    uid: string;
    /**
     * Channel the token was minted for, when the sender says.
     *
     * Present on anything the backend issues (`generateRtmToken` returns it);
     * absent on older payloads, which are then trusted as-is.
     */
    channel?: string;
  };
}

interface UseAgoraRtmTokenReturn {
  /** Agora RTM token (null until fetched) */
  token: string | null;
  /** Agora App ID */
  appId: string;
  /** RTM channel name (= roomId uppercased) */
  channel: string;
  /** RTM user ID string */
  uid: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches an Agora RTM signaling token for the current watch party room.
 *
 * @remarks
 * Re-fetches automatically when `roomId` or `userId` change.
 * Token is only requested when both `roomId` and `userId` are available
 * and the userId is not in an intermediate loading state.
 */
export function useAgoraRtmToken(
  options: UseAgoraRtmTokenOptions,
): UseAgoraRtmTokenReturn {
  const { roomId, userId, userName } = options;

  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [uid, setUid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /*
      A token handed to us by the join payload, used without a round trip.

      The guard used to be `roomId === preFetched.uid?.split(':')[0]`, which asks
      whether a USER id starts with a room code. For an authenticated user that is
      never true, so the fast path was dead and every join paid for a token fetch
      it already had; for a guest it was true only by coincidence of id format.

      The question actually worth asking is whether this token belongs to the room
      we are joining, and `channel` is the field that answers it. When the payload
      does not say, trust it: the only producer is this room's own approval
      message.
    */
    const preFetched = options.initialTokenData;
    const preFetchedChannel = preFetched?.channel?.toUpperCase();
    if (
      preFetched?.token &&
      (!preFetchedChannel ||
        !roomId ||
        preFetchedChannel === roomId.toUpperCase())
    ) {
      setToken(preFetched.token);
      setAppId(preFetched.appId);
      setChannel(roomId?.toUpperCase() || preFetchedChannel || '');
      setUid(preFetched.uid);
      return;
    }

    let cancelled = false;

    const fetchToken = async () => {
      // Guard: both roomId and a settled userId are required
      if (
        !roomId ||
        !userId ||
        userId.endsWith(':undefined') ||
        userId === 'undefined'
      ) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getAgoraRtmToken({
          channelName: roomId,
          guestId: userId,
          guestName: userName || 'Guest',
        });
        if (cancelled) return;
        setToken(data.token);
        setAppId(data.appId);
        setChannel(roomId.toUpperCase());
        setUid(data.uid);
      } catch (err) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [roomId, userId, userName, options.initialTokenData]);

  return { token, appId, channel, uid, isLoading, error };
}
