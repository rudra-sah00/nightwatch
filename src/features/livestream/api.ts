import { apiFetch } from '@/lib/fetch';
import type {
  LiveMatch,
  LivestreamMatchResponse,
  LivestreamScheduleResponse,
} from './types';

export type {
  CricketMatchInfo,
  LiveMatch,
  LivestreamMatchResponse,
  LivestreamScheduleResponse,
} from './types';

export const fetchLivestreamSchedule = async (
  sportType = 'basketball',
  daysBackward = 0,
  daysForward = 3,
  signal?: AbortSignal,
): Promise<LiveMatch[]> => {
  // Intentionally NOT catching here — let the error propagate to useLivestreams
  // so it sets error state and shows the retry UI instead of silently rendering
  // "No Matches Found" when the backend session isn't warm yet.
  const data = await apiFetch<LivestreamScheduleResponse>(
    `/api/livestream/schedule?sportType=${sportType}&daysBackward=${daysBackward}&daysForward=${daysForward}`,
    { signal },
  );
  return data?.items || [];
};

export const fetchLiveMatchDetail = async (
  id: string,
): Promise<LiveMatch | null> => {
  try {
    const data = await apiFetch<LivestreamMatchResponse>(
      `/api/livestream/match/${id}`,
    );
    return data?.match || null;
  } catch {
    return null;
  }
};
