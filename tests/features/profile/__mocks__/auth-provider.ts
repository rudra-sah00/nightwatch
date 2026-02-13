import { vi } from 'vitest';

export const useAuth = vi.fn(() => ({
  user: null,
  logout: vi.fn(),
  updateUser: vi.fn(),
}));
