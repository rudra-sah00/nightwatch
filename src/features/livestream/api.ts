import { apiFetch } from '@/lib/fetch';
import type {
  LiveMatch,
  LivestreamMatchResponse,
  LivestreamScheduleResponse,
} from './types';

export type {
  CricketMatchInfo,
  LiveMatch,
} from './types';

export const fetchLivestreamSchedule = async (
  sportType = 'basketball',
  daysBackward = 0,
  daysForward = 3,
  signal?: AbortSignal,
): Promise<LiveMatch[]> => {
  const data = await apiFetch<LivestreamScheduleResponse>(
    `/api/livestream/schedule?sportType=${sportType}&daysBackward=${daysBackward}&daysForward=${daysForward}&server=server1`,
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

export interface Channel {
  id: string;
  providerId: string;
  name: string;
  category: string | null;
  icon: string | null;
}

export interface ChannelsResponse {
  channels: Channel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchChannels = async (
  page = 1,
  limit = 30,
  search = '',
  signal?: AbortSignal,
): Promise<ChannelsResponse> => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  const data = await apiFetch<ChannelsResponse>(
    `/api/livestream/channels?${query.toString()}`,
    { signal },
  );
  return data || { channels: [], total: 0, page: 1, limit, totalPages: 0 };
};

export const fetchSports = async (signal?: AbortSignal) => {
  const data = await apiFetch<{ data: { id: string; label: string }[] }>(
    `/api/livestream/sports`,
    { signal },
  );
  return data?.data || [];
};
