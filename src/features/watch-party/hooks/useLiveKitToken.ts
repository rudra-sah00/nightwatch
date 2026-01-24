import { useEffect, useState } from 'react';
import { env } from '@/lib/env';

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

export function useLiveKitToken(
  options: UseLiveKitTokenOptions,
): UseLiveKitTokenReturn {
  const { roomId, userId, userName } = options;

  const [token, setToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string>(env.LIVEKIT_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ...
    const fetchToken = async () => {
      // ...
      try {
        const guestName = userName || 'Guest';
        const backendUrl = env.BACKEND_URL;

        const res = await fetch(
          `${backendUrl}/api/livekit/token?roomName=${roomId}&guestId=${userId}&guestName=${encodeURIComponent(guestName)}`,
          { credentials: 'include' },
        );

        if (!res.ok) {
          throw new Error('Failed to fetch LiveKit token');
        }

        const data = await res.json();
        setToken(data.token);

        // Use the URL provided by the backend (if any)
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
