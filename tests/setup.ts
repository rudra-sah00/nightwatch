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

vi.stubGlobal(
  'EventSource',
  class EventSource {
    close = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  },
);
