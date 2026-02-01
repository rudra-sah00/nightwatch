import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStorageCache,
  getCachedLocalStorage,
  removeCachedLocalStorage,
  setCachedLocalStorage,
} from '@/lib/storage-cache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Storage Cache', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    clearStorageCache();
  });

  describe('getCachedLocalStorage', () => {
    it('should get value from localStorage on first call', () => {
      localStorage.setItem('test-key', 'test-value');
      localStorageMock.getItem.mockClear(); // Clear mock calls from setItem

      const result = getCachedLocalStorage('test-key');

      expect(result).toBe('test-value');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return cached value on subsequent calls', () => {
      localStorage.setItem('test-key', 'test-value');
      clearStorageCache();
      localStorageMock.getItem.mockClear();

      // First call - should hit localStorage
      getCachedLocalStorage('test-key');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = getCachedLocalStorage('test-key');
      expect(result).toBe('test-value');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1); // Still only 1
    });

    it('should return null for non-existent key', () => {
      const result = getCachedLocalStorage('non-existent');
      expect(result).toBeNull();
    });

    it('should cache null values', () => {
      getCachedLocalStorage('non-existent');
      localStorageMock.getItem.mockClear();

      // Second call should use cached null
      const result = getCachedLocalStorage('non-existent');
      expect(result).toBeNull();
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage unavailable');
      });

      const result = getCachedLocalStorage('error-key');
      expect(result).toBeNull();
    });
  });

  describe('setCachedLocalStorage', () => {
    it('should set value in localStorage and cache', () => {
      setCachedLocalStorage('test-key', 'test-value');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        'test-value',
      );

      // Should be cached now
      localStorageMock.getItem.mockClear();
      const result = getCachedLocalStorage('test-key');
      expect(result).toBe('test-value');
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    it('should overwrite existing cached value', () => {
      setCachedLocalStorage('test-key', 'value1');
      setCachedLocalStorage('test-key', 'value2');

      localStorageMock.getItem.mockClear();
      const result = getCachedLocalStorage('test-key');
      expect(result).toBe('value2');
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors silently', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        setCachedLocalStorage('error-key', 'value');
      }).not.toThrow();
    });
  });

  describe('removeCachedLocalStorage', () => {
    it('should remove value from localStorage and cache', () => {
      setCachedLocalStorage('test-key', 'test-value');
      localStorageMock.removeItem.mockClear();

      removeCachedLocalStorage('test-key');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');

      // Should not be cached
      const result = getCachedLocalStorage('test-key');
      expect(result).toBeNull();
    });

    it('should handle non-existent keys', () => {
      expect(() => {
        removeCachedLocalStorage('non-existent');
      }).not.toThrow();
    });

    it('should handle localStorage errors silently', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage unavailable');
      });

      expect(() => {
        removeCachedLocalStorage('error-key');
      }).not.toThrow();
    });
  });

  describe('clearStorageCache', () => {
    it('should clear the entire cache', () => {
      setCachedLocalStorage('key1', 'value1');
      setCachedLocalStorage('key2', 'value2');
      localStorageMock.getItem.mockClear();

      clearStorageCache();

      // Should hit localStorage again after cache clear
      getCachedLocalStorage('key1');
      getCachedLocalStorage('key2');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
    });

    it('should not affect localStorage data', () => {
      setCachedLocalStorage('test-key', 'test-value');
      clearStorageCache();

      // Data should still be in localStorage
      expect(localStorage.getItem('test-key')).toBe('test-value');
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache on storage event with specific key', () => {
      setCachedLocalStorage('test-key', 'old-value');
      localStorageMock.getItem.mockClear();

      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'test-key',
        newValue: 'new-value',
        oldValue: 'old-value',
      });
      window.dispatchEvent(storageEvent);

      // Should read from localStorage again
      localStorage.setItem('test-key', 'new-value');
      const result = getCachedLocalStorage('test-key');
      expect(result).toBe('new-value');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    });

    it('should clear all cache on storage event with null key', () => {
      setCachedLocalStorage('key1', 'value1');
      setCachedLocalStorage('key2', 'value2');
      localStorageMock.getItem.mockClear();

      // Simulate storage clear event
      const storageEvent = new StorageEvent('storage', {
        key: null,
      });
      window.dispatchEvent(storageEvent);

      // Both keys should be refetched
      getCachedLocalStorage('key1');
      getCachedLocalStorage('key2');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on visibilitychange event', () => {
      setCachedLocalStorage('test-key', 'test-value');
      localStorageMock.getItem.mockClear();

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should refetch from localStorage
      getCachedLocalStorage('test-key');
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    });

    it('should not clear cache when tab becomes hidden', () => {
      setCachedLocalStorage('test-key', 'test-value');
      localStorageMock.getItem.mockClear();

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should still use cache
      const result = getCachedLocalStorage('test-key');
      expect(result).toBe('test-value');
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });
  });
});
