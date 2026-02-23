'use client';

import { useEffect, useState } from 'react';
import { env } from '@/lib/env';
import { getAgoraToken } from '../agora-api';

interface UseAgoraTokenOptions {
  roomId: string | undefined;
  userId: string | undefined;
  userName?: string;
}

interface UseAgoraTokenReturn {
  token: string | null;
  appId: string;
  channel: string;
  uid: number;
  isLoading: boolean;
  error: string | null;
}

export function useAgoraToken(
  options: UseAgoraTokenOptions,
): UseAgoraTokenReturn {
  const { roomId, userId, userName } = options;

  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string>(env.AGORA_APP_ID);
  const [channel, setChannel] = useState<string>('');
  const [uid, setUid] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const guestToken =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('guest_token')
          : null;

      const isAuthenticatedAsUser = userId && !userId.startsWith('guest:');
      const isApprovedGuest = userId?.startsWith('guest:') && guestToken;

      if (
        !roomId ||
        !userId ||
        userId.endsWith(':undefined') ||
        (!isAuthenticatedAsUser && !isApprovedGuest)
      ) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const guestName = userName || 'Guest';
        const data = await getAgoraToken({
          channelName: roomId,
          guestId: userId,
          guestName,
        });

        setToken(data.token);
        setAppId(data.appId);
        setChannel(data.channel);
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
  }, [roomId, userId, userName]);

  return {
    token,
    appId,
    channel,
    uid,
    isLoading,
    error,
  };
}
