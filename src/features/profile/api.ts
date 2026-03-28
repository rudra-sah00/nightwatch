import { apiFetch } from '@/lib/fetch';
import type { User } from '@/types';
import type { ChangePasswordInput, UpdateProfileInput } from './schema';
import type { WatchActivity } from './types';

/**
 * User profile management and caching.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Profile cache (5 minutes)
let profileCache: CacheEntry<{ user: User }> | null = null;
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

export async function getProfile(
  options?: RequestInit,
): Promise<{ user: User }> {
  // Check cache first
  if (profileCache && profileCache.expiry > Date.now()) {
    return profileCache.data;
  }

  const result = await apiFetch<{ user: User }>('/api/auth/me', options);
  profileCache = { data: result, expiry: Date.now() + PROFILE_CACHE_TTL };
  return result;
}

// Invalidate profile cache (call after updates)
export function invalidateProfileCache(): void {
  profileCache = null;
}

export async function updateProfile(
  data: UpdateProfileInput,
  options?: RequestInit,
): Promise<{ user: User }> {
  const result = await apiFetch<{ user: User }>('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
    ...options,
  });
  // Update cache with new data
  profileCache = { data: result, expiry: Date.now() + PROFILE_CACHE_TTL };
  return result;
}

export async function checkUsername(
  username: string,
  options?: RequestInit,
): Promise<{ available: boolean }> {
  return apiFetch(`/api/user/check-username/${username}`, options);
}

/**
 * Get watch activity - always fresh from server (no client cache)
 */
export async function getWatchActivity(
  options?: RequestInit,
): Promise<WatchActivity[]> {
  const { activity } = await apiFetch<{
    activity: { date: string; watchSeconds: number; level: number }[];
  }>('/api/watch/activity', options);

  return activity.map((a) => ({
    date: a.date,
    count: a.watchSeconds / 60,
    level: a.level as WatchActivity['level'],
  }));
}

export async function uploadProfileImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const result = await apiFetch<{ user: { profilePhoto: string } }>(
    '/api/user/profile-image',
    {
      method: 'POST',
      body: formData,
    },
  );

  // Invalidate profile cache so fresh data is fetched
  invalidateProfileCache();
  return { url: result.user.profilePhoto };
}

export async function changePassword(
  {
    currentPassword,
    newPassword,
  }: Pick<ChangePasswordInput, 'currentPassword' | 'newPassword'>,
  options?: RequestInit,
): Promise<void> {
  await apiFetch('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
    ...options,
  });
}

/**
 * Get public profile data by ID (UUID compulsory)
 */
export async function getPublicProfile(
  id: string,
  options?: RequestInit,
): Promise<{
  profile: User & { activity: { date: string; watchSeconds: number }[] };
}> {
  return apiFetch<{
    profile: User & { activity: { date: string; watchSeconds: number }[] };
  }>(`/api/user/public/${id}`, options);
}
