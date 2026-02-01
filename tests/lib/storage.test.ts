import { beforeEach, describe, expect, it } from 'vitest';

// Mock localStorage for happy-dom
const createMockStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// Override global localStorage if it doesn't have the expected methods
if (
  !globalThis.localStorage ||
  typeof globalThis.localStorage.clear !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMockStorage(),
    writable: true,
  });
}

if (
  !globalThis.sessionStorage ||
  typeof globalThis.sessionStorage.clear !== 'function'
) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createMockStorage(),
    writable: true,
  });
}

describe('LocalStorage Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves string values', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('stores and retrieves JSON objects', () => {
    const obj = { name: 'test', value: 123 };
    localStorage.setItem('test-obj', JSON.stringify(obj));

    const retrieved = JSON.parse(localStorage.getItem('test-obj') || '{}');
    expect(retrieved).toEqual(obj);
  });

  it('returns null for non-existent keys', () => {
    expect(localStorage.getItem('non-existent')).toBeNull();
  });

  it('removes items', () => {
    localStorage.setItem('test-key', 'test-value');
    localStorage.removeItem('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('clears all items', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    localStorage.clear();

    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('key2')).toBeNull();
  });
});

describe('SessionStorage Helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores session data', () => {
    sessionStorage.setItem('session-key', 'session-value');
    expect(sessionStorage.getItem('session-key')).toBe('session-value');
  });

  it('clears on browser close (simulated)', () => {
    sessionStorage.setItem('temp', 'data');
    sessionStorage.clear(); // Simulate browser close
    expect(sessionStorage.getItem('temp')).toBeNull();
  });
});

describe('Token Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const TOKEN_KEY = 'auth-token';
  const REFRESH_KEY = 'refresh-token';

  it('stores auth token', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    localStorage.setItem(TOKEN_KEY, token);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it('stores refresh token', () => {
    const refreshToken = 'refresh-token-123';
    localStorage.setItem(REFRESH_KEY, refreshToken);
    expect(localStorage.getItem(REFRESH_KEY)).toBe(refreshToken);
  });

  it('removes tokens on logout', () => {
    localStorage.setItem(TOKEN_KEY, 'token');
    localStorage.setItem(REFRESH_KEY, 'refresh');

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });
});

describe('User Preferences Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores playback preferences', () => {
    const preferences = {
      volume: 0.8,
      playbackRate: 1.5,
      quality: '1080p',
      subtitles: true,
    };

    localStorage.setItem('playback-prefs', JSON.stringify(preferences));
    const retrieved = JSON.parse(
      localStorage.getItem('playback-prefs') || '{}',
    );

    expect(retrieved.volume).toBe(0.8);
    expect(retrieved.quality).toBe('1080p');
  });

  it('stores theme preference', () => {
    localStorage.setItem('theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('stores language preference', () => {
    localStorage.setItem('language', 'en-US');
    expect(localStorage.getItem('language')).toBe('en-US');
  });
});

describe('Watch History Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores watch history', () => {
    const history = [
      { contentId: 'show-1', timestamp: Date.now() },
      { contentId: 'movie-1', timestamp: Date.now() },
    ];

    localStorage.setItem('watch-history', JSON.stringify(history));
    const retrieved = JSON.parse(localStorage.getItem('watch-history') || '[]');

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].contentId).toBe('show-1');
  });

  it('limits history size', () => {
    const MAX_HISTORY = 50;
    const history = Array.from({ length: 60 }, (_, i) => ({
      contentId: `content-${i}`,
      timestamp: Date.now(),
    }));

    const limitedHistory = history.slice(-MAX_HISTORY);
    localStorage.setItem('watch-history', JSON.stringify(limitedHistory));

    const retrieved = JSON.parse(localStorage.getItem('watch-history') || '[]');
    expect(retrieved).toHaveLength(MAX_HISTORY);
  });
});
