/**
 * User API service - Profile, Watch Activity, Password Change
 */

import { apiRequest } from './client';

// Types
export interface UserStats {
  total_watch_time_seconds: number;
  total_days_active: number;
  current_streak: number;
  longest_streak: number;
  average_daily_seconds: number;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  created_at: string | null;
  last_login: string | null;
  stats: UserStats;
}

export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  avatar_url?: string;
}

export interface DailyActivity {
  date: string;
  watch_seconds: number;
  level: number; // 0-4 intensity
}

export interface WatchActivitySummary {
  activities: DailyActivity[];
  total_seconds: number;
  total_days: number;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Helper to unwrap API response
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest<T>(endpoint, options);
  if (response.error) {
    throw new Error(response.error);
  }
  if (!response.data) {
    throw new Error('No data returned');
  }
  return response.data;
}

/**
 * Get user profile with stats
 */
export async function getUserProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/user/profile');
}

/**
 * Upload profile avatar
 */
export async function uploadAvatar(file: File): Promise<{ success: boolean; avatar_url: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  return request<{ success: boolean; avatar_url: string }>('/api/user/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Update user profile
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get watch activity for contribution graph (last 365 days)
 */
export async function getWatchActivity(): Promise<WatchActivitySummary> {
  return request<WatchActivitySummary>('/api/user/watch-activity');
}

/**
 * Record watch time (called while video is playing)
 */
export async function recordWatchTime(
  seconds: number
): Promise<{ success: boolean; today_total_seconds: number }> {
  return request<{ success: boolean; today_total_seconds: number }>('/api/user/watch-activity', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  });
}

/**
 * Change user password
 */
export async function changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Format seconds to human readable string
 */
export function formatWatchTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds to detailed string (for stats)
 */
export function formatWatchTimeDetailed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
