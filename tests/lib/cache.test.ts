import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllCaches, createTTLCache } from '@/lib/cache';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined for missing keys', () => {
    const cache = createTTLCache<string>(5000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    const cache = createTTLCache<string>(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('has() returns true for valid entries', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('has() returns false for expired entries', () => {
    const cache = createTTLCache<string>(1000);
    cache.set('key', 'value');
    vi.advanceTimersByTime(1001);
    expect(cache.has('key')).toBe(false);
  });

  it('delete() removes an entry', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('evicts expired entries when maxSize is exceeded', () => {
    const cache = createTTLCache<string>(1000, 2);
    cache.set('a', '1');
    vi.advanceTimersByTime(500);
    cache.set('b', '2');
    vi.advanceTimersByTime(600); // 'a' is now expired (1100ms)

    // Adding a third entry triggers cleanup, evicting expired 'a'
    cache.set('c', '3');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('overwrites existing keys', () => {
    const cache = createTTLCache<string>(5000);
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });
});

describe('clearAllCaches', () => {
  it('clears all created caches', () => {
    const cache1 = createTTLCache<string>(5000);
    const cache2 = createTTLCache<number>(5000);
    cache1.set('a', 'hello');
    cache2.set('b', 42);

    clearAllCaches();

    expect(cache1.get('a')).toBeUndefined();
    expect(cache2.get('b')).toBeUndefined();
  });
});
