import { apiFetch } from '@/lib/fetch';
import type { LiveMatch, LivestreamMatchResponse } from './types';

export type { CricketMatchInfo, LiveMatch } from './types';

/**
 * Fetches detailed information for a single live match.
 *
 * @param id - Unique match identifier.
 * @returns The match details, or `null` if not found or on error.
 */
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

// === IPTV ===

export interface IptvChannel {
  id: string;
  providerId: string;
  name: string;
  category: string | null;
  icon: string | null;
  streamUrl: string | null;
  server: string;
}

export interface IptvChannelsResponse {
  channels: IptvChannel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchIptvChannels = async (
  page = 1,
  limit = 30,
  search = '',
  category = '',
  signal?: AbortSignal,
): Promise<IptvChannelsResponse> => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(category && { category }),
  });

  const data = await apiFetch<IptvChannelsResponse>(
    `/api/livestream/iptv/channels?${query.toString()}`,
    { signal },
  );
  return data || { channels: [], total: 0, page: 1, limit, totalPages: 0 };
};

export const fetchIptvCategories = async (
  signal?: AbortSignal,
): Promise<string[]> => {
  const data = await apiFetch<{ categories: string[] }>(
    `/api/livestream/iptv/categories`,
    { signal },
  );
  return data?.categories || [];
};

export const fetchIptvResolve = async (
  channelId: string,
  signal?: AbortSignal,
): Promise<string | null> => {
  const data = await apiFetch<{ streamUrl: string }>(
    `/api/livestream/iptv/resolve/${channelId}`,
    { signal },
  );
  return data?.streamUrl || null;
};
