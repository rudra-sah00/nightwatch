import { vi } from 'vitest';

export const getProfile = vi.fn();
export const invalidateProfileCache = vi.fn();
export const getWatchActivity = vi.fn().mockResolvedValue([]);
export const uploadProfileImage = vi.fn();
export const checkUsername = vi.fn();
export const updateProfile = vi.fn();
export const changePassword = vi.fn();
