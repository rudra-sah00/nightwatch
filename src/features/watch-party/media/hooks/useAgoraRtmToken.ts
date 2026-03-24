'use client';

import { useEffect, useState } from 'react';
import { getAgoraRtmToken } from '../services/agora.api';

interface UseAgoraRtmTokenOptions {
  /** Room code — channel name for the RTM token */
  roomId: string | undefined;
  /** Current user's ID */
  userId: string | undefined;
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
  const { roomId, userId } = options;

  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [uid, setUid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        const data = await getAgoraRtmToken({ channelName: roomId });
        setToken(data.token);
        setAppId(data.appId);
        setChannel(roomId.toUpperCase());
        setUid(data.uid);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomId, userId]);

  return { token, appId, channel, uid, isLoading, error };
}
