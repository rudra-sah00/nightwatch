import { vi } from 'vitest';

export const useAuth = vi.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  login: vi.fn(),
  register: vi.fn(),
  verifyOtp: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  resendOtp: vi.fn(),
}));
