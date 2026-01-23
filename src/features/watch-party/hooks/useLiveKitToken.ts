'use client';

import { useEffect, useState } from 'react';

interface UseLiveKitTokenOptions {
  roomId: string | undefined;
  userId: string | undefined;
  userName?: string;
}

interface UseLiveKitTokenReturn {
  token: string | null;
  liveKitUrl: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch LiveKit token for a watch party room
 * Extracted from WatchPartySidebar for better separation of concerns
 */
export function useLiveKitToken(
  options: UseLiveKitTokenOptions,
): UseLiveKitTokenReturn {
  const { roomId, userId, userName } = options;

  const [token, setToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !userId) {
      return;
    }

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const guestName = userName || 'Guest';
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

        const res = await fetch(
          `${backendUrl}/api/livekit/token?roomName=${roomId}&guestId=${userId}&guestName=${encodeURIComponent(guestName)}`,
          { credentials: 'include' },
        );

        if (!res.ok) {
          throw new Error('Failed to fetch LiveKit token');
        }

        const data = await res.json();
        setToken(data.token);
        if (data.url) {
          setLiveKitUrl(data.url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomId, userId, userName]);

  return {
    token,
    liveKitUrl,
    isLoading,
    error,
  };
}
