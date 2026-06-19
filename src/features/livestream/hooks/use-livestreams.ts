import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '@/lib/analytics';
import { fetchLiveMatchDetail, fetchLivestreamSchedule } from '../api';
import type { LiveMatch } from '../types';

/**
 * Fetches and manages the livestream schedule for a given sport type.
 * Uses TanStack Query for caching.
 */
export function useLivestreams(sportType = 'basketball') {
  const {
    data: schedule = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['live', 'channels', sportType],
    queryFn: async () => {
      const data = await fetchLivestreamSchedule(sportType, 0, 3);
      const unique = Array.from(
        new Map(data.map((item) => [item.id, item])).values(),
      );
      return unique.toSorted((a, b) => a.startTime - b.startTime);
    },
  });

  return {
    schedule,
    isLoading,
    error: error as Error | null,
    refresh: refetch,
  };
}

/**
 * Fetches and polls a single live match by ID.
 * Uses TanStack Query with a short refetchInterval for live matches.
 */
export function useLiveMatch(id: string | null) {
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMatch = useCallback(
    async (isPoll = false) => {
      if (!id) return;

      try {
        if (!isPoll) setIsLoading(true);
        setError(null);
        const data = await fetchLiveMatchDetail(id);
        if (data !== null) {
          if (isPoll) {
            setMatch((prev) => {
              if (
                prev &&
                prev.playPath === data.playPath &&
                prev.playType === data.playType &&
                prev.status === data.status &&
                prev.team1.score === data.team1.score &&
                prev.team2.score === data.team2.score &&
                prev.timeDesc === data.timeDesc
              ) {
                return prev;
              }
              return data;
            });
          } else {
            setMatch(data);
          }
        } else if (!isPoll) {
          setMatch(null);
        }
      } catch (err: unknown) {
        if (!isPoll) {
          reportError('[Livestream] Match fetch failed');
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!isPoll) setIsLoading(false);
      }
    },
    [id],
  );

  const matchRef = useRef(match);
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    loadMatch();

    const interval = setInterval(() => {
      const current = matchRef.current;
      if (
        current &&
        !current.playPath &&
        (current.status === 'MatchIng' || current.status === 'MatchNotStart')
      ) {
        loadMatch(true);
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [loadMatch]);

  return {
    match,
    isLoading,
    error,
  };
}
