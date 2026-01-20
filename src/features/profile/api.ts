import { env } from '@/lib/env';
import { apiFetch } from '@/lib/fetch';
import type { User } from '@/types';
import type { WatchActivity } from './types';

export async function getProfile(options?: RequestInit): Promise<{ user: User }> {
  return apiFetch('/api/auth/me', options);
}

export async function updateProfile(data: Partial<User>, options?: RequestInit): Promise<{ user: User }> {
  return apiFetch('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
    ...options,
  });
}

export async function checkUsername(username: string, options?: RequestInit): Promise<{ available: boolean }> {
  return apiFetch(`/api/user/check-username/${username}`, options);
}

export async function getWatchActivity(options?: RequestInit): Promise<WatchActivity[]> {
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

  // We can't use apiFetch for FormData directly if it sets Content-Type to json
  // Usually apiFetch wrapper handles this or we need to override.
  // My apiFetch forces 'Content-Type': 'application/json'.
  // I should probably manually fetch or update apiFetch.
  // For now I'll use raw fetch wrapper or assume apiFetch can be patched.
  // Actually best to just use fetch + get token logic if needed.
  // But apiFetch includes credentials: included.

  // I'll assume simple fetch for now since I can't easily change apiFetch right now without risk.
  // Actually I can modify apiFetch to NOT set Content-Type if body is FormData.
  // But let's check apiFetch implementation in step 512.
  // It spreads headers.

  return fetch(`${env.BACKEND_URL}/api/user/profile-image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    // no Content-Type header so browser sets boundary
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Upload failed');
    }
    return res.json();
  });
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
