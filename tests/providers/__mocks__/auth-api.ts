import { vi } from 'vitest';

export const loginUser = vi.fn();
export const logoutUser = vi.fn(() => Promise.resolve({ message: 'ok' }));
export const registerUser = vi.fn();
export const verifyOtp = vi.fn();
export const resendOtp = vi.fn();
export const getPlatformStats = vi.fn(() =>
  Promise.resolve({ totalWatchTimeSeconds: 0 }),
);
