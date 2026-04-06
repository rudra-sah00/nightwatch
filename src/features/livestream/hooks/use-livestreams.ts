import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLiveMatchDetail, fetchLivestreamSchedule } from '../api';
import type { LiveMatch } from '../types';

export function useLivestreams(sportType = 'basketball', server = 'server1') {
  const [schedule, setSchedule] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Cancels in-flight requests when sportType changes or the component unmounts
  // so stale responses don't arrive after navigation to another page.
  const abortRef = useRef<AbortController | null>(null);

  const loadSchedule = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchLivestreamSchedule(
        sportType,
        0,
        3,
        server,
        controller.signal,
      );

      if (controller.signal.aborted) return;
      // Deduplicate by ID to prevent React "duplicate key" errors from inconsistent API responses
      const uniqueData = Array.from(
        new Map(data.map((item) => [item.id, item])).values(),
      );
      // Sort by start time (ascending) without mutating the API response
      const sortedData = uniqueData.toSorted(
        (a, b) => a.startTime - b.startTime,
      );
      setSchedule(sortedData);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [sportType, server]);

  useEffect(() => {
    loadSchedule();
    return () => {
      abortRef.current?.abort();
    };
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

    // Poll to keep checking for a stream URL before the match starts.
    // Once we have the stream URL (playPath), we can stop polling entirely
    // since the player doesn't display live score updates anyway.
    const interval = setInterval(() => {
      const current = matchRef.current;
      if (
        current &&
        !current.playPath &&
        (current.status === 'MatchIng' || current.status === 'MatchNotStart')
      ) {
        loadMatch(true); // isPoll=true
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
