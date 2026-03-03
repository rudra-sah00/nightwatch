import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLiveMatchDetail, fetchLivestreamSchedule } from '../api';
import type { LiveMatch } from '../types';

export function useLivestreams(sportType = 'basketball') {
  const [schedule, setSchedule] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchLivestreamSchedule(sportType);

      // Sort by start time (ascending) without mutating the API response
      const sortedData = data.toSorted((a, b) => a.startTime - b.startTime);
      setSchedule(sortedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sportType]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  return {
    schedule,
    isLoading,
    error,
    refresh: loadSchedule,
  };
}

export function useLiveMatch(id: string | null) {
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMatch = useCallback(
    async (isPoll = false) => {
      if (!id) return;

      try {
        // Don't flash a loading spinner on background polls
        if (!isPoll) setIsLoading(true);
        setError(null);
        const data = await fetchLiveMatchDetail(id);
        if (data !== null) {
          if (isPoll) {
            // During background polls (which may include a 401→refresh cycle),
            // only update state if player-critical fields actually changed.
            // Updating with an identical-content but new object reference would
            // cause the player to re-initialize and produce a visible blink.
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
                return prev; // nothing meaningful changed — keep same reference
              }
              return data;
            });
          } else {
            setMatch(data);
          }
        } else if (!isPoll) {
          // Only clear the match on an explicit (initial) load — never during a
          // background poll, so a transient 404 never kills an active stream.
          setMatch(null);
        }
      } catch (err: unknown) {
        if (!isPoll) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        // Swallow poll errors silently — keep the existing match alive
      } finally {
        if (!isPoll) setIsLoading(false);
      }
    },
    [id],
  );

  // Use a ref to read the latest match status inside setInterval without
  // adding `match` to the effect deps (which would cause an infinite loop).
  const matchRef = useRef(match);
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    loadMatch();

    // Poll every minute if the match is about to start or is live
    const interval = setInterval(() => {
      const current = matchRef.current;
      if (
        current &&
        (current.status === 'MatchIng' || current.status === 'MatchNotStart')
      ) {
        loadMatch(true); // isPoll=true — never clears an active stream on 404
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [loadMatch]);

  return {
    match,
    isLoading,
    error,
  };
}
