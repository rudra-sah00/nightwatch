/**
 * Regression tests for PLAYER_AUDIT H15 — subtitles froze after a level switch.
 *
 * `cuechange` listeners were attached to a snapshot of `video.textTracks` taken when the effect
 * ran, with deps `[videoRef, currentTrackId]`. hls.js can replace the underlying `TextTrack` on
 * a level switch or a discontinuity without `currentTrackId` changing, which left every listener
 * on an orphaned track: subtitles stopped updating mid-playback until the user toggled them off
 * and on. The 2s safety poll only covers the moments after mount, so a switch later in the film
 * was not caught.
 *
 * A hand-rolled element is used rather than a real `<video>`: happy-dom returns a fresh
 * `TextTrackList` and fresh `TextTrack` objects on every property access, so listeners attach to
 * throwaway objects and nothing can be observed. Real browsers keep those identities stable, so
 * the fake is the faithful model here.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubtitleOverlay } from '@/features/watch/player/ui/compound/hooks/use-subtitle-overlay';

/** A TextTrack carrying one cue, with real listener bookkeeping. */
function fakeTrack(id: string, text: string) {
  const listeners = new Set<() => void>();
  return {
    id,
    label: id,
    mode: 'showing' as TextTrackMode,
    activeCues: [{ text }] as unknown as TextTrackCueList,
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) =>
      listeners.delete(fn),
    /** Number of cuechange listeners currently attached. */
    listenerCount: () => listeners.size,
    /** Fire cuechange, as the element does when the active cue changes. */
    emit: () => {
      for (const fn of listeners) fn();
    },
  };
}

/** A video whose `textTracks` is a stable, mutable list — as real browsers provide. */
function fakeVideo(initial: ReturnType<typeof fakeTrack>[]) {
  let tracks = [...initial];
  const listListeners = new Map<string, Set<() => void>>();
  const textTracks = {
    get length() {
      return tracks.length;
    },
    addEventListener: (type: string, fn: () => void) => {
      if (!listListeners.has(type)) listListeners.set(type, new Set());
      listListeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listListeners.get(type)?.delete(fn);
    },
  } as Record<string, unknown>;
  for (let i = 0; i < 20; i++) {
    Object.defineProperty(textTracks, i, { get: () => tracks[i] });
  }

  /** Replace the track list the way hls.js does on a level switch, then announce it. */
  const replaceTracks = (next: ReturnType<typeof fakeTrack>[]) => {
    tracks = [...next];
    for (const fn of listListeners.get('addtrack') ?? []) fn();
  };

  // The hook has a second effect that listens on the element itself.
  const video = {
    textTracks,
    currentTime: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement;

  return { video, replaceTracks };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('subtitle overlay re-binds cuechange (PLAYER_AUDIT H15)', () => {
  it('shows the cue from the initially bound track', () => {
    const track = fakeTrack('en', 'hello');
    const { video } = fakeVideo([track]);

    const { result } = renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    expect(result.current.cueText).toBe('hello');
  });

  it('attaches a cuechange listener to the track', () => {
    const track = fakeTrack('en', 'hello');
    const { video } = fakeVideo([track]);

    renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    expect(track.listenerCount()).toBe(1);
  });

  /** The defect: after the swap the listener sat on a track nothing would ever fire on. */
  it('binds to the replacement track when hls.js swaps it', () => {
    const original = fakeTrack('en', 'first');
    const { video, replaceTracks } = fakeVideo([original]);
    renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    const replacement = fakeTrack('en', 'second');
    act(() => {
      replaceTracks([replacement]);
    });

    expect(replacement.listenerCount()).toBe(1);
  });

  it('picks up cues from the replacement track', () => {
    const original = fakeTrack('en', 'first');
    const { video, replaceTracks } = fakeVideo([original]);
    const { result } = renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    const replacement = fakeTrack('en', 'second');
    act(() => {
      replaceTracks([replacement]);
    });

    expect(result.current.cueText).toBe('second');
  });

  it('keeps updating from the replacement track afterwards', () => {
    const original = fakeTrack('en', 'first');
    const { video, replaceTracks } = fakeVideo([original]);
    const { result } = renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    const replacement = fakeTrack('en', 'second');
    act(() => {
      replaceTracks([replacement]);
    });
    replacement.activeCues = [{ text: 'third' }] as unknown as TextTrackCueList;
    act(() => {
      replacement.emit();
    });

    expect(result.current.cueText).toBe('third');
  });

  /** The orphaned listener must not linger and fire into a stale closure. */
  it('releases the listener on the track it replaced', () => {
    const original = fakeTrack('en', 'first');
    const { video, replaceTracks } = fakeVideo([original]);
    renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    act(() => {
      replaceTracks([fakeTrack('en', 'second')]);
    });

    expect(original.listenerCount()).toBe(0);
  });

  it('detaches everything on unmount', () => {
    const track = fakeTrack('en', 'hello');
    const { video } = fakeVideo([track]);
    const { unmount } = renderHook(() =>
      useSubtitleOverlay({
        videoRef: { current: video },
        currentTrackId: 'en',
      }),
    );

    unmount();

    expect(track.listenerCount()).toBe(0);
  });
});
