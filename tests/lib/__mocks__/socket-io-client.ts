import { vi } from 'vitest';

export const io = vi.fn(() => ({
  connected: false,
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));
