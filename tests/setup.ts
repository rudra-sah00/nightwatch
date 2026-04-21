import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next-intl — returns the key (or interpolates {placeholders}) so tests can assert on translation keys
vi.mock('next-intl', () => {
  const createT = () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      if (values) {
        let result = key;
        for (const [k, v] of Object.entries(values)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    };
    t.rich = t;
    t.raw = (key: string) => key;
    t.has = () => true;
    return t;
  };
  return {
    useTranslations: () => createT(),
    useLocale: () => 'en',
    useMessages: () => ({}),
    useNow: () => new Date(),
    useTimeZone: () => 'UTC',
    useFormatter: () => ({
      number: (n: number) => String(n),
      dateTime: (d: Date) => d.toISOString(),
      relativeTime: (d: Date) => d.toISOString(),
    }),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      if (values) {
        let result = key;
        for (const [k, v] of Object.entries(values)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    };
    t.rich = t;
    t.raw = (key: string) => key;
    t.has = () => true;
    return t;
  },
  getLocale: async () => 'en',
  getMessages: async () => ({}),
  getNow: async () => new Date(),
  getTimeZone: async () => 'UTC',
}));

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

// Mock tauriAPI globally
Object.defineProperty(window, 'tauriAPI', {
  value: {
    startDownload: vi.fn(),
    getDownloads: vi.fn().mockResolvedValue([]),
    onDownloadProgress: vi.fn(),
    removeDownloadProgress: vi.fn(),
    onDownloadComplete: vi.fn(),
    removeDownloadComplete: vi.fn(),
    onDownloadError: vi.fn(),
    removeDownloadError: vi.fn(),
  },
  writable: true,
});
