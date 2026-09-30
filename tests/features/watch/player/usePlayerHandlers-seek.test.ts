/**
 * Tests that `playerHandlers.seek`/`skip` inherit the seek controller's guarantees
 * (SEEKING.md D7, D8, P0 #3).
 *
 * `handleSeek` used to be the absolute writer that bypassed every rule:
 *
 * ```ts
 * if (Number.isFinite(time) && videoRef.current) {
 *   videoRef.current.currentTime = time;   // no clamp, no serialisation
 * }
 * ```
 *
 * A target past the end went straight to the element, and a target arriving while a seek
 * was in flight aborted it. Only `useKeyboard`'s relative seek clamped, which is why fixing
 * a bug at one call site fixed one control and left the other seven.
 *
 * Both handlers now route through the single `useSeekController` instance, so these
 * assertions are about the wiring rather than the controller itself — they fail against the
 * old direct assignment.
 */
import { act, renderHook } from '@testing-library/react';
import type { Dispatch } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerAction } from '@/features/watch/player/context/types';
import { usePlayerHandlers } from '@/features/watch/player/hooks/usePlayerHandlers';
import { useSeekController } from '@/features/watch/player/hooks/useSeekController';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  reportError: vi.fn(),
}));

function makeVideo(currentTime = 100, duration = 600) {
  const writes: number[] = [];
  const listeners = new Map<string, Set<EventListener>>();
  let current = currentTime;
  const empty = { length: 0, start: () => 0, end: () => 0 };
  const el = {
    get currentTime() {
      return current;
    },
    set currentTime(t: number) {
      current = t;
      writes.push(t);
    },
    duration,
    seekable: empty,
    buffered: empty,
    volume: 1,
    muted: false,
    playbackRate: 1,
    addEventListener: (type: string, fn: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      listeners.get(type)?.delete(fn);
    },
  } as unknown as HTMLVideoElement;
  const settle = () =>
    act(() => {
      for (const fn of listeners.get('seeked') ?? []) fn(new Event('seeked'));
    });
  return { el, writes, settle };
}

/** Mounts the handlers on top of a real controller, as `use-player-root` does. */
function mount(video: HTMLVideoElement, readOnly = false) {
  return renderHook(() => {
    const videoRef = { current: video };
    const { seekTo, seekBy } = useSeekController({
      videoRef,
      disabled: readOnly,
    });
    return usePlayerHandlers({
      videoRef,
      dispatch: vi.fn() as unknown as Dispatch<PlayerAction>,
      isPlaying: true,
      isPaused: false,
      readOnly,
      togglePlay: vi.fn(),
      toggleMute: vi.fn(),
      seekTo,
      seekBy,
      setQuality: vi.fn(),
      setAudioTrack: vi.fn(),
      qualities: [],
    });
  });
}

describe('playerHandlers.seek goes through the controller (D7)', () => {
  it('clamps a seek past the end instead of writing it through', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el);

    act(() => result.current.handleSeek(9999));

    expect(writes).toEqual([600]);
  });

  it('clamps a negative seek to zero', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el);

    act(() => result.current.handleSeek(-30));

    expect(writes).toEqual([0]);
  });

  it('serialises a burst into one write plus the latest target (D8)', () => {
    const { el, writes, settle } = makeVideo(0);
    const { result } = mount(el);

    act(() => {
      result.current.handleSeek(10);
      result.current.handleSeek(20);
      result.current.handleSeek(30);
    });

    expect(writes).toEqual([10]);

    settle();

    expect(writes).toEqual([10, 30]);
  });

  it('still seeks normally within range', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el);

    act(() => result.current.handleSeek(250));

    expect(writes).toEqual([250]);
  });

  it('skips relative to the live playhead', () => {
    const { el, writes } = makeVideo(100);
    const { result } = mount(el);

    act(() => result.current.handleSkip(-10));

    expect(writes).toEqual([90]);
  });

  it('clamps a relative skip that would run past the end', () => {
    const { el, writes } = makeVideo(595);
    const { result } = mount(el);

    act(() => result.current.handleSkip(30));

    expect(writes).toEqual([600]);
  });

  it('does nothing for read-only players', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el, true);

    act(() => result.current.handleSeek(250));
    act(() => result.current.handleSkip(10));

    expect(writes).toEqual([]);
  });
});
