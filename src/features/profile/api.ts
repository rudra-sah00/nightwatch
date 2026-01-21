import { env } from '@/lib/env';
import { apiFetch } from '@/lib/fetch';
import type { User } from '@/types';
import type { WatchActivity } from './types';

// ===== CACHE UTILITIES =====

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Profile cache (5 minutes)
let profileCache: CacheEntry<{ user: User }> | null = null;
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

// Watch activity cache (5 minutes)
let watchActivityCache: CacheEntry<WatchActivity[]> | null = null;
const WATCH_ACTIVITY_CACHE_TTL = 5 * 60 * 1000;

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
  data: Partial<User>,
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

export async function getWatchActivity(
  options?: RequestInit,
): Promise<WatchActivity[]> {
  // Check cache first
  if (watchActivityCache && watchActivityCache.expiry > Date.now()) {
    return watchActivityCache.data;
  }

  const { activity } = await apiFetch<{
    activity: { date: string; watchSeconds: number; level: number }[];
  }>('/api/watch/activity', options);

  const mappedActivity = activity.map((a) => ({
    date: a.date,
    count: a.watchSeconds / 60,
    level: a.level as WatchActivity['level'],
  }));

  watchActivityCache = {
    data: mappedActivity,
    expiry: Date.now() + WATCH_ACTIVITY_CACHE_TTL,
  };
  return mappedActivity;
}

// Invalidate watch activity cache (call after significant watch time)
export function invalidateWatchActivityCache(): void {
  watchActivityCache = null;
}

export async function uploadProfileImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const result = await fetch(`${env.BACKEND_URL}/api/user/profile-image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Upload failed');
    }
    return res.json();
  });

  // Invalidate profile cache so fresh data is fetched
  invalidateProfileCache();
  return result;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  options?: RequestInit,
): Promise<void> {
  await apiFetch('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
    ...options,
  });
}
