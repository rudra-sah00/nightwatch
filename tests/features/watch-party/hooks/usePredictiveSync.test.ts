import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PARTY_PLAYBACK_BLOCKED_EVENT,
  type PartyPlaybackBlockedDetail,
  usePredictiveSync,
} from '@/features/watch-party/room/hooks/usePredictiveSync';
import type { PartyStateUpdate } from '@/features/watch-party/room/types';

/**
 * A `<video>` stand-in with the handful of members the hook touches.
 *
 * happy-dom's `HTMLVideoElement` has no media pipeline: `play()` is a no-op that
 * never flips `paused`, `readyState` is read-only, and `seekable` is empty. The
 * hook's whole job is reacting to those, so they have to be controllable.
 */
function fakeVideo(
  overrides: Partial<{
    readyState: number;
    paused: boolean;
    currentTime: number;
    seekableStart: number;
    seekableEnd: number;
    playRejection: Error | null;
  }> = {},
) {
  const state = {
    readyState: overrides.readyState ?? 1,
    paused: overrides.paused ?? true,
    currentTime: overrides.currentTime ?? 0,
    seekableStart: overrides.seekableStart ?? 0,
    seekableEnd: overrides.seekableEnd ?? 10_000,
    playRejection: overrides.playRejection ?? null,
  };

  const listeners = new Map<string, Set<() => void>>();
  const playCalls: { muted: boolean }[] = [];

  const video = {
    get readyState() {
      return state.readyState;
    },
    get paused() {
      return state.paused;
    },
    currentTime: state.currentTime,
    playbackRate: 1,
    muted: false,
    seekable: {
      get length() {
        return state.seekableEnd > state.seekableStart ? 1 : 0;
      },
      start: () => state.seekableStart,
      end: () => state.seekableEnd,
    },
    play: vi.fn(() => {
      playCalls.push({ muted: video.muted });
      // Muted playback is exempt from autoplay policy in every browser that
      // implements one, so a muted retry succeeds where the first call failed.
      if (state.playRejection && !video.muted) {
        return Promise.reject(state.playRejection);
      }
      state.paused = false;
      return Promise.resolve();
    }),
    pause: vi.fn(() => {
      state.paused = true;
    }),
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn);
    },
  };

  return {
    video: video as unknown as HTMLVideoElement,
    state,
    playCalls,
    /** Fire a media readiness event, as the browser would. */
    emit(type: string) {
      for (const fn of listeners.get(type) ?? []) fn();
    },
    hasListener(type: string) {
      return (listeners.get(type)?.size ?? 0) > 0;
    },
  };
}

/**
 * Drain the promise chain without advancing timers.
 *
 * The autoplay recovery is a `.catch().then()` chain, so it settles in
 * microtasks. `vi.runAllTimersAsync()` cannot be used to wait for it: the hook
 * holds two recurring intervals (element rebind, state enforcement), so running
 * all timers never terminates.
 */
async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

function playingUpdate(over: Partial<PartyStateUpdate> = {}): PartyStateUpdate {
  return {
    currentTime: 0,
    videoTime: 0,
    isPlaying: true,
    playbackRate: 1,
    timestamp: 1_000,
    serverTime: 1_000,
    eventType: 'init',
    ...over,
  };
}

describe('usePredictiveSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('live rooms', () => {
    it('starts a paused guest when the party is playing', () => {
      const f = fakeVideo({ paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate()));

      expect(f.video.play).toHaveBeenCalled();
    });

    it('never seeks — a live window is per-client', () => {
      const f = fakeVideo({ paused: true, currentTime: 50 });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() =>
        result.current.applyState(playingUpdate({ videoTime: 9_999_999 })),
      );

      expect(f.video.currentTime).toBe(50);
    });

    it('follows a host pause', () => {
      const f = fakeVideo({ paused: false });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate({ isPlaying: false })));

      expect(f.video.pause).toHaveBeenCalled();
    });
  });

  describe('held updates', () => {
    /*
      Regression: the applier used to poll every 250 ms and give up after 10 s.
      When the deadline passed, `stateRef` was still null — which also disables the
      2 s enforcement loop, since it returns early without state. The guest was
      left with a paused video, no state, and nothing that would ever set either.

      A live channel served through the backend playlist proxy (resolve upstream,
      fetch, rewrite, then fetch a segment) routinely misses 10 s on a cold cache.
    */
    it('applies a held update long after the old 10s deadline', () => {
      const f = fakeVideo({ readyState: 0, paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate()));
      expect(f.video.play).not.toHaveBeenCalled();

      // Well past the window the previous implementation allowed.
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(f.video.play).not.toHaveBeenCalled();

      // The manifest finally parses.
      act(() => {
        f.state.readyState = 1;
        f.emit('canplay');
      });

      expect(f.video.play).toHaveBeenCalled();
    });

    it('applies a held update on loadedmetadata', () => {
      const f = fakeVideo({ readyState: 0, paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate()));
      act(() => {
        f.state.readyState = 1;
        f.emit('loadedmetadata');
      });

      expect(f.video.play).toHaveBeenCalled();
    });

    it('binds to a video element that mounts after the hook', () => {
      const ref: { current: HTMLVideoElement | null } = { current: null };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate()));

      const f = fakeVideo({ readyState: 1, paused: true });
      act(() => {
        ref.current = f.video;
        vi.advanceTimersByTime(600);
      });

      expect(f.video.play).toHaveBeenCalled();
    });

    it('does nothing for the host', () => {
      const f = fakeVideo({ readyState: 0 });
      const ref = { current: f.video };
      renderHook(() => usePredictiveSync(ref, 0, true, true, true));

      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      expect(f.hasListener('canplay')).toBe(false);
    });
  });

  describe('seek clamping', () => {
    /*
      Assigning `currentTime` outside `video.seekable` does not throw — it stalls
      silently, and nothing downstream can tell that apart from "still buffering".
    */
    it('clamps a target beyond the seekable end', () => {
      const f = fakeVideo({
        readyState: 1,
        paused: false,
        seekableStart: 0,
        seekableEnd: 100,
      });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, false, false, false),
      );

      act(() =>
        result.current.applyState(
          playingUpdate({ videoTime: 500, currentTime: 500 }),
        ),
      );

      expect(f.video.currentTime).toBeLessThanOrEqual(100);
      expect(f.video.currentTime).toBeGreaterThan(90);
    });

    it('clamps a target before the seekable start', () => {
      const f = fakeVideo({
        readyState: 1,
        paused: false,
        currentTime: 200,
        seekableStart: 120,
        seekableEnd: 300,
      });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, false, false, false),
      );

      act(() =>
        result.current.applyState(
          playingUpdate({ videoTime: 5, currentTime: 5, isPlaying: false }),
        ),
      );

      expect(f.video.currentTime).toBeGreaterThanOrEqual(120);
    });

    it('does not move the playhead when nothing is seekable yet', () => {
      const f = fakeVideo({
        readyState: 1,
        currentTime: 7,
        seekableStart: 0,
        seekableEnd: 0,
      });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, false, false, false),
      );

      act(() =>
        result.current.applyState(
          playingUpdate({ videoTime: 900, currentTime: 900 }),
        ),
      );

      expect(f.video.currentTime).toBe(7);
    });
  });

  describe('blocked autoplay', () => {
    /*
      `play()` rejects with NotAllowedError whenever the document has no user
      activation — the normal state for someone who opened an invite link and was
      approved without clicking inside the page. Every call site used to swallow
      that, and the guest's centre overlay is inert by design, so there was then no
      way at all — automatic or manual — to start the video.
    */
    it('retries muted and announces that it did', async () => {
      const detail: PartyPlaybackBlockedDetail[] = [];
      const onBlocked = (e: Event) => {
        detail.push((e as CustomEvent<PartyPlaybackBlockedDetail>).detail);
      };
      window.addEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);

      const err = new Error('blocked');
      err.name = 'NotAllowedError';
      const f = fakeVideo({ paused: true, playRejection: err });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      await act(async () => {
        result.current.applyState(playingUpdate());
        await flushMicrotasks();
      });

      expect(f.playCalls).toEqual([{ muted: false }, { muted: true }]);
      expect(detail).toEqual([{ muted: true }]);

      window.removeEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);
    });

    it('reports a hard block when even muted playback is refused', async () => {
      const detail: PartyPlaybackBlockedDetail[] = [];
      const onBlocked = (e: Event) => {
        detail.push((e as CustomEvent<PartyPlaybackBlockedDetail>).detail);
      };
      window.addEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);

      const err = new Error('blocked');
      err.name = 'NotAllowedError';
      const f = fakeVideo({ paused: true });
      // Refuse unconditionally, muted or not.
      (f.video as unknown as { play: () => Promise<void> }).play = vi.fn(() =>
        Promise.reject(err),
      );
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      await act(async () => {
        result.current.applyState(playingUpdate());
        await flushMicrotasks();
      });

      expect(detail).toEqual([{ muted: false }]);
      // Sound is restored, so the manual prompt starts playback unmuted.
      expect(f.video.muted).toBe(false);

      window.removeEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);
    });

    it('leaves an unrelated play() rejection alone', async () => {
      const err = new Error('aborted by a new load request');
      err.name = 'AbortError';
      const f = fakeVideo({ paused: true, playRejection: err });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      await act(async () => {
        result.current.applyState(playingUpdate());
        await flushMicrotasks();
      });

      // No muted retry: an AbortError is not an autoplay refusal.
      expect(f.playCalls).toEqual([{ muted: false }]);
      expect(f.video.muted).toBe(false);
    });
  });

  describe('enforcement loop', () => {
    it('re-starts a guest whose browser paused them', () => {
      const f = fakeVideo({ paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, false),
      );

      act(() => result.current.applyState(playingUpdate()));
      (f.video.play as ReturnType<typeof vi.fn>).mockClear();

      // Something outside the party paused it — a background tab, for instance.
      act(() => {
        f.state.paused = true;
        vi.advanceTimersByTime(2_000);
      });

      expect(f.video.play).toHaveBeenCalled();
    });

    it('does not run for the host', () => {
      const f = fakeVideo({ paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, true, true),
      );

      act(() => result.current.applyState(playingUpdate()));
      (f.video.play as ReturnType<typeof vi.fn>).mockClear();

      act(() => {
        f.state.paused = true;
        vi.advanceTimersByTime(6_000);
      });

      expect(f.video.play).not.toHaveBeenCalled();
    });
  });

  describe('getExpectedTime', () => {
    it('extrapolates from the host position using the clock offset', () => {
      const f = fakeVideo({ readyState: 1, paused: false });
      const ref = { current: f.video };
      const now = Date.now();
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, false, false),
      );

      act(() =>
        result.current.applyState(
          playingUpdate({
            videoTime: 100,
            currentTime: 100,
            serverTime: now - 4_000,
            timestamp: now - 4_000,
          }),
        ),
      );

      // 4 s of wall clock at rate 1 puts the host near 104.
      expect(result.current.getExpectedTime()).toBeGreaterThan(103);
      expect(result.current.getExpectedTime()).toBeLessThan(105);
    });

    it('holds still while paused', () => {
      const f = fakeVideo({ readyState: 1, paused: true });
      const ref = { current: f.video };
      const { result } = renderHook(() =>
        usePredictiveSync(ref, 0, true, false, false),
      );

      act(() =>
        result.current.applyState(
          playingUpdate({ videoTime: 42, currentTime: 42, isPlaying: false }),
        ),
      );

      expect(result.current.getExpectedTime()).toBe(42);
    });
  });
});
