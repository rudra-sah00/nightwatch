import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import type { User } from '@/types';
import type { ChangePasswordInput, UpdateProfileInput } from './schema';
import type { MusicActivity, WatchActivity } from './types';

/**
 * User profile management — TanStack Query handles caching.
 */
export async function getProfile(
  options?: RequestInit,
): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/me', options);
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
  trackEvent('profile_update');
  return result;
}

export { checkUsername } from '@/features/auth/api';

/**
 * Get watch activity - always fresh from server
 */
export async function getWatchActivity(
  options?: RequestInit,
): Promise<WatchActivity[]> {
  const result = await apiFetch<{
    activity: { date: string; watchSeconds: number; level: number }[];
  }>('/api/watch/activity', options);

  if (!result?.activity) return [];

  return result.activity.map((a) => ({
    date: a.date,
    count: a.watchSeconds / 60,
    level: a.level as WatchActivity['level'],
  }));
}

export async function getMusicActivity(
  options?: RequestInit,
): Promise<MusicActivity[]> {
  const result = await apiFetch<{
    activity: { date: string; listenSeconds: number; level: number }[];
  }>('/api/music/activity', options);

  if (!result?.activity) return [];

  return result.activity.map((a) => ({
    date: a.date,
    count: a.listenSeconds / 60,
    level: a.level as MusicActivity['level'],
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
  trackEvent('password_change');
}

export async function deleteAccount(options?: RequestInit): Promise<void> {
  await apiFetch('/api/user/profile', {
    method: 'DELETE',
    ...options,
  });
}

/**
 * Get public profile data by ID
 */
export async function getPublicProfile(
  id: string,
  options?: RequestInit,
): Promise<{
  profile: User & {
    activity: { date: string; watchSeconds: number }[];
    musicActivity: { date: string; listenSeconds: number }[];
  };
}> {
  return apiFetch<{
    profile: User & {
      activity: { date: string; watchSeconds: number }[];
      musicActivity: { date: string; listenSeconds: number }[];
    };
  }>(`/api/user/public/${id}`, options);
}
