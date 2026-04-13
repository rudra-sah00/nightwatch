import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:4000';
process.env.NEXT_PUBLIC_WS_URL = 'http://localhost:4000';
process.env.NEXT_PUBLIC_AGORA_APP_ID = 'test-agora-app-id';
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-key';

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((_event, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback({ success: true });
        }
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
      id: 'mock-socket-id',
    },
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock localStorage and sessionStorage for Zustand and other modules
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

Object.defineProperty(window, 'localStorage', { value: createStorageMock() });
Object.defineProperty(window, 'sessionStorage', { value: createStorageMock() });
