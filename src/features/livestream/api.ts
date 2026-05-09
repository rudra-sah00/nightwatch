import { createTTLCache } from '@/lib/cache';
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

// Short TTL cache (60s) for schedule — avoids redundant fetches when
// navigating away from /live and back quickly.
const scheduleCache = createTTLCache<LiveMatch[]>(60 * 1000, 10);

/**
 * Fetches the livestream schedule for a given sport type.
 *
 * @param sportType - Sport category to filter by (default `"basketball"`).
 * @param daysBackward - Number of past days to include (default `0`).
 * @param daysForward - Number of future days to include (default `3`).
 * @param signal - Optional `AbortSignal` for request cancellation.
 * @returns Array of live matches within the date range.
 */
export const fetchLivestreamSchedule = async (
  sportType = 'basketball',
  daysBackward = 0,
  daysForward = 3,
  signal?: AbortSignal,
): Promise<LiveMatch[]> => {
  const cacheKey = `${sportType}:${daysBackward}:${daysForward}`;
  const cached = scheduleCache.get(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<LivestreamScheduleResponse>(
    `/api/livestream/schedule?sportType=${sportType}&daysBackward=${daysBackward}&daysForward=${daysForward}&server=server1`,
    { signal },
  );
  const items = data?.items || [];
  scheduleCache.set(cacheKey, items);
  return items;
};

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

/** A live TV channel entry. */
export interface Channel {
  /** Unique channel identifier. */
  id: string;
  /** Provider-specific identifier. */
  providerId: string;
  /** Display name of the channel. */
  name: string;
  /** Channel category (e.g. sports, news), or `null`. */
  category: string | null;
  /** URL of the channel icon, or `null`. */
  icon: string | null;
  /** Whether the channel is currently online or offline. */
  status?: 'online' | 'offline';
  /** Current viewer count. */
  viewers?: number;
}

/** Paginated response from the channels API. */
export interface ChannelsResponse {
  /** Array of channels for the current page. */
  channels: Channel[];
  /** Total number of channels matching the query. */
  total: number;
  /** Current page number. */
  page: number;
  /** Number of items per page. */
  limit: number;
  /** Total number of available pages. */
  totalPages: number;
}

/**
 * Fetches a paginated list of live TV channels.
 *
 * @param page - Page number (default `1`).
 * @param limit - Items per page (default `30`).
 * @param search - Optional search query to filter channels by name.
 * @param signal - Optional `AbortSignal` for request cancellation.
 * @returns Paginated channels response.
 */
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

// Sports list is essentially static — cache for 30 minutes.
const sportsCache = createTTLCache<{ id: string; label: string }[]>(
  30 * 60 * 1000,
  1,
);

/**
 * Fetches the list of available sport categories for the livestream schedule.
 *
 * @param signal - Optional `AbortSignal` for request cancellation.
 * @returns Array of sport objects with `id` and `label`.
 */
export const fetchSports = async (signal?: AbortSignal) => {
  const cached = sportsCache.get('sports');
  if (cached) return cached;

  const data = await apiFetch<{ data: { id: string; label: string }[] }>(
    `/api/livestream/sports`,
    { signal },
  );
  const sports = data?.data || [];
  sportsCache.set('sports', sports);
  return sports;
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
): Promise<string | null> => {
  const data = await apiFetch<{ streamUrl: string }>(
    `/api/livestream/iptv/resolve/${channelId}`,
  );
  return data?.streamUrl || null;
};
