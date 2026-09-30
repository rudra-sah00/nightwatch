/**
 * Tests for the seek re-prime memory — SEEKING.md D5, P1 #8.
 *
 * `needsSeekReprimeRef` starts false and only flips once a seek has produced the
 * unrecoverable decode signature. Because it lived at hook scope it reset on every mount, so
 * on affected content the first seek of *every* playback was the one designed to fail — and
 * that failure is a fatal error, a stream refetch, an engine remount and a visible toast, not
 * the "single ~1s recovery" the original reasoning assumed. Combined with resume-on-load it
 * usually happened before the user touched anything.
 *
 * Remembering the answer per title makes the discovery cost one error per title instead of one
 * per playback. The TTL is what keeps the original objection satisfied: a permanent flag would
 * charge the seek penalty long after an upstream re-encode fixed the title.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  needsSeekReprime,
  rememberSeekReprime,
} from '@/features/watch/player/services/SeekReprimeMemory';
import { clearStorageCache } from '@/lib/storage-cache';

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  // Reads are memoised in a module-level Map, so clearing localStorage alone would leave
  // the previous test's value visible.
  clearStorageCache();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  clearStorageCache();
});

describe('seek re-prime memory (SEEKING.md D5)', () => {
  it('does not claim a title needs re-priming before anything is recorded', () => {
    expect(needsSeekReprime('show-1')).toBe(false);
  });

  it('remembers a title that produced the decode signature', () => {
    rememberSeekReprime('show-1');

    expect(needsSeekReprime('show-1')).toBe(true);
  });

  /** The point of the fix: the answer survives the engine remount and the next playback. */
  it('keeps the answer across playbacks', () => {
    rememberSeekReprime('show-1');

    // A fresh read, as a new mount would do.
    expect(needsSeekReprime('show-1')).toBe(true);
  });

  it('keeps titles separate', () => {
    rememberSeekReprime('show-1');

    expect(needsSeekReprime('show-2')).toBe(false);
  });

  /** A re-encode upstream must eventually stop being charged the seek penalty. */
  it('forgets the answer once the TTL lapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    rememberSeekReprime('show-1');
    expect(needsSeekReprime('show-1')).toBe(true);

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 8 * DAY_MS);

    expect(needsSeekReprime('show-1')).toBe(false);
  });

  it('still trusts the answer just inside the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    rememberSeekReprime('show-1');

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 6 * DAY_MS);

    expect(needsSeekReprime('show-1')).toBe(true);
  });

  it('refreshes the timestamp when a title is recorded again', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    rememberSeekReprime('show-1');

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 6 * DAY_MS);
    rememberSeekReprime('show-1');
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 10 * DAY_MS);

    expect(needsSeekReprime('show-1')).toBe(true);
  });

  /** A title we cannot key on must probe as before rather than guess. */
  it('treats a missing content id as unknown', () => {
    rememberSeekReprime(undefined);

    expect(needsSeekReprime(undefined)).toBe(false);
  });

  it('survives corrupt stored data without throwing', () => {
    localStorage.setItem('nw:seek-reprime', '{not json');

    expect(() => needsSeekReprime('show-1')).not.toThrow();
    expect(needsSeekReprime('show-1')).toBe(false);
  });

  it('survives a stored value of the wrong shape', () => {
    localStorage.setItem('nw:seek-reprime', '["show-1"]');

    expect(needsSeekReprime('show-1')).toBe(false);
  });

  /** The entry must not grow without bound across a long binge. */
  it('bounds how many titles it remembers', () => {
    for (let i = 0; i < 260; i++) rememberSeekReprime(`show-${i}`);

    const stored = JSON.parse(localStorage.getItem('nw:seek-reprime') ?? '{}');
    expect(Object.keys(stored).length).toBeLessThanOrEqual(200);
    // Eviction drops the oldest, so the most recent survives.
    expect(needsSeekReprime('show-259')).toBe(true);
  });
});
