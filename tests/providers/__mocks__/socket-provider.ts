import { vi } from 'vitest';

export const useSocket = vi.fn(() => ({
  socket: { connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  isConnected: true,
  connect: vi.fn(),
  connectGuest: vi.fn(),
  disconnect: vi.fn(),
}));
