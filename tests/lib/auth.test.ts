import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredUser, getStoredUser, storeUser } from '@/lib/auth';
import { clearStorageCache } from '@/lib/storage-cache';

// Mock localStorage
const localStorageMock = (() => {
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
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Utils', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearStorageCache(); // Clear the in-memory cache
  });

  describe('getStoredUser', () => {
    it('should return null when no user is stored', () => {
      const result = getStoredUser();
      expect(result).toBeNull();
    });

    it('should return stored user', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      localStorage.setItem('user', JSON.stringify(mockUser));

      const result = getStoredUser();
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('user', 'invalid json');

      const result = getStoredUser();
      expect(result).toBeNull();
    });

    it('should return null for corrupted data', () => {
      localStorage.setItem('user', '{incomplete');

      const result = getStoredUser();
      expect(result).toBeNull();
    });
  });

  describe('storeUser', () => {
    it('should store user in localStorage', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      storeUser(mockUser);

      const stored = localStorage.getItem('user');
      expect(stored).toBe(JSON.stringify(mockUser));
    });

    it('should overwrite existing user', () => {
      const user1 = {
        id: '123',
        email: 'old@example.com',
        name: 'Old User',
        username: 'olduser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      const user2 = {
        id: '456',
        email: 'new@example.com',
        name: 'New User',
        username: 'newuser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-02',
      };

      storeUser(user1);
      storeUser(user2);

      const result = getStoredUser();
      expect(result).toEqual(user2);
    });

    it('should handle user with special characters', () => {
      const mockUser = {
        id: '123',
        email: 'test+tag@example.com',
        name: "O'Brien",
        username: 'user_123',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      storeUser(mockUser);

      const result = getStoredUser();
      expect(result).toEqual(mockUser);
    });
  });

  describe('clearStoredUser', () => {
    it('should remove user from localStorage', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      storeUser(mockUser);
      expect(getStoredUser()).toEqual(mockUser);

      clearStoredUser();
      expect(getStoredUser()).toBeNull();
    });

    it('should not throw if no user exists', () => {
      expect(() => clearStoredUser()).not.toThrow();
    });

    it('should only remove user key', () => {
      localStorage.setItem('other_key', 'other_value');
      localStorage.setItem('user', JSON.stringify({ id: '123' }));

      clearStoredUser();

      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('other_value');
    });
  });

  describe('SSR safety', () => {
    it('getStoredUser should return null on server side', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR
      delete global.window;

      const result = getStoredUser();
      expect(result).toBeNull();

      global.window = originalWindow;
    });

    it('storeUser should not throw on server side', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR
      delete global.window;

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      expect(() => storeUser(mockUser)).not.toThrow();

      global.window = originalWindow;
    });

    it('clearStoredUser should not throw on server side', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR
      delete global.window;

      expect(() => clearStoredUser()).not.toThrow();

      global.window = originalWindow;
    });
  });
});
