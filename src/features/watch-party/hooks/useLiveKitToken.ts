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

  // Check for stale guest token on mount
  useEffect(() => {
    const guestToken =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('guest_token')
        : null;
    if (guestToken) {
    }
  }, []); // Run once on mount

  useEffect(() => {
    const fetchToken = async () => {
      const guestToken =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('guest_token')
          : null;

      // Prevent fetching with incomplete data or without approval
      // If it's a guest ID (startsWith guest:), they MUST have a questToken (approval)
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
        const backendUrl = env.BACKEND_URL;

        const isGuest = userId?.startsWith('guest:');

        const url = `${backendUrl}/api/livekit/token?roomName=${roomId}&guestId=${userId}&guestName=${encodeURIComponent(guestName)}`;

        const res = await fetch(url, {
          credentials: 'include',
          headers:
            isGuest && guestToken
              ? {
                  Authorization: `Bearer ${guestToken}`,
                }
              : undefined,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch LiveKit token');
        }

        const data = await res.json();
        setToken(data.token);

        // Use the URL provided by the backend (if any)
        if (data.url) {
          setLiveKitUrl(data.url);
        }
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
    liveKitUrl,
    isLoading,
    error,
  };
}
