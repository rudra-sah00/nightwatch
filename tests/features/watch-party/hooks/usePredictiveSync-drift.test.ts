/**
 * Regression tests for SEEKING.md D4 — the watch-party drift correction fed a re-prime loop.
 *
 * Every 2s a non-host compares its playhead against the expected party time and hard-seeks
 * when drift exceeds the threshold. Sound in isolation, but on content that needs a seek
 * re-prime a hard seek makes `useHls` discard the buffer and refetch — a stall of its own.
 * The stall increased drift, so two seconds later drift was still over threshold and it
 * hard-seeked again: another fragment abort storm, with no convergence condition. A guest who
 * once drifted past the threshold could stay in seek → re-prime → stall → drift → seek
 * indefinitely. Invisible in the single-viewer case, which is why it was never isolated.
 *
 * Phase 0 found this branch had no test coverage at all — the existing suite covers the
 * play/pause enforcement in the same interval but none of the drift arithmetic.
 *
 * Two guards: skip the tick entirely while a seek is in flight or the buffer is too thin to
 * play from (drift measured then is the stall, not desync), and widen the hard-seek threshold
 * each time a correction fails to converge.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePredictiveSync } from '@/features/watch-party/room/hooks/usePredictiveSync';
import type { PartyStateUpdate } from '@/features/watch-party/room/types';

/** `HTMLMediaElement.HAVE_ENOUGH_DATA`, i.e. comfortably playable. */
const READY = 4;
/** `HTMLMediaElement.HAVE_CURRENT_DATA` — below the guard's HAVE_FUTURE_DATA threshold. */
const STALLED = 2;

function fakeVideo(
  over: { readyState?: number; seeking?: boolean; currentTime?: number } = {},
) {
  const seekTargets: number[] = [];
  let current = over.currentTime ?? 0;
  const video = {
    readyState: over.readyState ?? READY,
    seeking: over.seeking ?? false,
    paused: false,
    playbackRate: 1,
    muted: false,
    get currentTime() {
      return current;
    },
    set currentTime(t: number) {
      current = t;
      seekTargets.push(t);
    },
    seekable: { length: 1, start: () => 0, end: () => 100_000 },
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement & { seeking: boolean; readyState: number };
  return { video, seekTargets };
}

function update(over: Partial<PartyStateUpdate> = {}): PartyStateUpdate {
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

/** Mounts a calibrated, non-live guest and seeds it with a playing party state. */
function mountGuest(video: HTMLVideoElement) {
  const ref = { current: video };
  const hook = renderHook(() => usePredictiveSync(ref, 0, true, false, false));
  act(() => hook.result.current.applyState(update()));
  return hook;
}

/** Advances past N drift-check intervals. */
function tick(times = 1) {
  act(() => {
    vi.advanceTimersByTime(2000 * times);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('watch-party drift correction (SEEKING.md D4)', () => {
  /**
   * The loop's entry point: a guest far behind gets hard-seeked. This must keep working —
   * the fix is about not repeating it blindly, not about abandoning correction.
   */
  it('hard-seeks a guest that has drifted well past the threshold', () => {
    // Party time advances with the wall clock; the element stays at 0, so drift grows.
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    mountGuest(video);

    vi.setSystemTime(1_000 + 30_000);
    tick();

    expect(seekTargets.length).toBeGreaterThan(0);
  });

  /** Guard one: a seek already in flight means the playhead is not where it will be. */
  it('does not hard-seek while a seek is already in flight', () => {
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    mountGuest(video);
    (video as unknown as { seeking: boolean }).seeking = true;

    vi.setSystemTime(1_000 + 30_000);
    tick(3);

    expect(seekTargets).toEqual([]);
  });

  /**
   * Guard one again: a buffer too thin to play from is exactly the state the re-prime
   * creates, and the drift measured during it is the stall rather than desync.
   */
  it('does not hard-seek while the buffer is too thin to play from', () => {
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    mountGuest(video);
    (video as unknown as { readyState: number }).readyState = STALLED;

    vi.setSystemTime(1_000 + 30_000);
    tick(3);

    expect(seekTargets).toEqual([]);
  });

  it('resumes correcting once the buffer recovers', () => {
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    mountGuest(video);
    (video as unknown as { readyState: number }).readyState = STALLED;

    vi.setSystemTime(1_000 + 30_000);
    tick(2);
    expect(seekTargets).toEqual([]);

    (video as unknown as { readyState: number }).readyState = READY;
    tick();

    expect(seekTargets.length).toBeGreaterThan(0);
  });

  /**
   * Guard two, and the one that actually breaks the loop: a guest whose playhead never moves
   * — the shape a stuck re-prime produces — must stop being hard-seeked every 2s. Without
   * backoff this fired on all 20 ticks.
   */
  it('backs off instead of hard-seeking on every tick when it cannot converge', () => {
    /*
      A seek that does not stick, which is what the loop actually looked like: the hard seek
      triggers a re-prime, the re-prime discards the buffer and stalls, and the playhead ends
      up no closer to the party than before. Recording the target but leaving the position
      alone models that without needing a real media pipeline.
    */
    const seekTicks: number[] = [];
    let currentTick = 0;
    const video = {
      readyState: READY,
      seeking: false,
      paused: false,
      playbackRate: 1,
      muted: false,
      get currentTime() {
        return 0;
      },
      set currentTime(_t: number) {
        seekTicks.push(currentTick);
      },
      seekable: { length: 1, start: () => 0, end: () => 100_000 },
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;
    mountGuest(video);

    for (let i = 1; i <= 12; i++) {
      currentTick = i;
      vi.setSystemTime(1_000 + i * 2000);
      tick();
    }

    // Unguarded, this corrects on every tick it is over threshold — a hard seek every 2s
    // with no convergence condition. Backoff must space them out instead.
    expect(seekTicks.length).toBeGreaterThan(0);
    expect(seekTicks.length).toBeLessThan(12);

    // The property that matters: successive failures push the next correction further away.
    const gaps = seekTicks
      .slice(1)
      .map((t, i) => t - seekTicks[i])
      .filter((g) => g > 0);
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    expect(gaps.at(-1)).toBeGreaterThan(gaps[0]);
  });

  /** Backoff must not make a guest permanently tolerant of desync. */
  it('resets the backoff once drift returns to the soft range', () => {
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    mountGuest(video);

    vi.setSystemTime(1_000 + 30_000);
    tick();
    const afterFirst = seekTargets.length;
    expect(afterFirst).toBeGreaterThan(0);

    // Land back in sync so the streak resets, then drift far out again.
    (video as unknown as { currentTime: number }).currentTime = 29.9;
    vi.setSystemTime(1_000 + 30_000);
    tick();

    (video as unknown as { currentTime: number }).currentTime = 0;
    vi.setSystemTime(1_000 + 60_000);
    tick();

    expect(seekTargets.length).toBeGreaterThan(afterFirst);
  });

  /** Hosts are the source of truth and must never self-correct. */
  it('does not correct drift for the host', () => {
    const { video, seekTargets } = fakeVideo({ currentTime: 0 });
    const ref = { current: video };
    const hook = renderHook(() => usePredictiveSync(ref, 0, true, false, true));
    act(() => hook.result.current.applyState(update()));

    vi.setSystemTime(1_000 + 30_000);
    tick(3);

    expect(seekTargets).toEqual([]);
  });
});
