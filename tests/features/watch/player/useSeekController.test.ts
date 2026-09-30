/**
 * Tests for `useSeekController` — SEEKING.md D6, D7 and D8, and P0 #3.
 *
 * Eight sites used to assign `video.currentTime` under two incompatible conventions
 * (`playerHandlers.seek` absolute, `skip` and `useKeyboard.seek` relative), so every new
 * control reinvented seeking. Three defects came out of that and are asserted here:
 *
 * - **D6** relative offsets were computed from React state, which `timeupdate` refreshes
 *   only every ~250 ms, so rapid presses all measured from the same stale base and lost
 *   distance.
 * - **D7** only `useKeyboard` clamped against live `duration`/`seekable`;
 *   `usePlayerHandlers.handleSeek` checked `Number.isFinite` and nothing else.
 * - **D8** nothing waited for `seeked` before issuing the next seek, so a burst aborted its
 *   own fragment loads. Apple's QA1820 and the MSE coalescing behaviour both say the work
 *   for every seek but the last is wasted.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeekController } from '@/features/watch/player/hooks/useSeekController';

type Range = {
  length: number;
  start: (i: number) => number;
  end: (i: number) => number;
};

/**
 * A video stand-in that records `currentTime` writes and only fires `seeked` when told to,
 * so a seek can be held "in flight" for as long as a test needs.
 */
function makeVideo(
  opts: { currentTime?: number; duration?: number; seekable?: Range } = {},
) {
  const writes: number[] = [];
  const listeners = new Map<string, Set<EventListener>>();
  let current = opts.currentTime ?? 100;
  const empty: Range = { length: 0, start: () => 0, end: () => 0 };
  const el = {
    get currentTime() {
      return current;
    },
    set currentTime(t: number) {
      current = t;
      writes.push(t);
    },
    duration: opts.duration ?? 600,
    seekable: opts.seekable ?? empty,
    buffered: empty,
    addEventListener: (type: string, fn: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      listeners.get(type)?.delete(fn);
    },
  } as unknown as HTMLVideoElement;

  /** Completes the seek the element is currently performing. */
  const settle = () => {
    act(() => {
      for (const fn of listeners.get('seeked') ?? []) fn(new Event('seeked'));
    });
  };

  return { el, writes, settle };
}

function mount(
  video: HTMLVideoElement,
  opts: { isLive?: boolean; disabled?: boolean } = {},
) {
  return renderHook(() =>
    useSeekController({ videoRef: { current: video }, ...opts }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useSeekController — clamping (D7)', () => {
  it('clamps an absolute seek past the end to the duration', () => {
    const { el, writes } = makeVideo({ duration: 600 });
    const { result } = mount(el);

    act(() => result.current.seekTo(9999));

    expect(writes).toEqual([600]);
  });

  it('clamps a negative absolute seek to zero', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el);

    act(() => result.current.seekTo(-50));

    expect(writes).toEqual([0]);
  });

  it('ignores a non-finite target rather than writing NaN', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el);

    act(() => result.current.seekTo(Number.NaN));
    act(() => result.current.seekBy(Number.POSITIVE_INFINITY));

    expect(writes).toEqual([]);
  });

  /** Seeking an element whose duration is unknown silently fails, so do nothing. */
  it('does nothing when the duration is not known yet', () => {
    const { el, writes } = makeVideo({ duration: Number.NaN });
    const { result } = mount(el);

    act(() => result.current.seekTo(30));

    expect(writes).toEqual([]);
  });

  it('clamps to the DVR window on live, not to duration', () => {
    const seekable: Range = { length: 1, start: () => 500, end: () => 900 };
    const { el, writes, settle } = makeVideo({ currentTime: 880, seekable });
    const { result } = mount(el, { isLive: true });

    act(() => result.current.seekTo(100));
    expect(writes).toEqual([500]);

    // Settle first, or the second request would coalesce into the one in flight.
    settle();
    act(() => result.current.seekTo(9999));
    expect(writes.at(-1)).toBe(900);
  });

  it('does nothing on live when there is no seekable range yet', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el, { isLive: true });

    act(() => result.current.seekTo(30));

    expect(writes).toEqual([]);
  });

  it('never seeks when disabled', () => {
    const { el, writes } = makeVideo();
    const { result } = mount(el, { disabled: true });

    act(() => result.current.seekTo(30));
    act(() => result.current.seekBy(10));

    expect(writes).toEqual([]);
  });
});

describe('useSeekController — relative base (D6)', () => {
  it('computes a relative seek from the live element position', () => {
    const { el, writes } = makeVideo({ currentTime: 100 });
    const { result } = mount(el);

    act(() => result.current.seekBy(-10));

    expect(writes).toEqual([90]);
  });

  /**
   * The D6 defect: three taps inside one `timeupdate` window all read the same base, so the
   * user travelled 10 s instead of 30 s. Accumulating means chaining off the pending target.
   */
  it('accumulates rapid relative seeks instead of losing distance', () => {
    const { el, writes, settle } = makeVideo({ currentTime: 100 });
    const { result } = mount(el);

    act(() => result.current.seekBy(10));
    act(() => result.current.seekBy(10));
    act(() => result.current.seekBy(10));
    settle();

    // 100 → 110 committed, then +10 and +10 coalesced into a single 130.
    expect(writes.at(-1)).toBe(130);
  });
});

describe('useSeekController — one seek in flight (D8)', () => {
  it('writes once for a burst and then once more with the latest target', () => {
    const { el, writes, settle } = makeVideo({ currentTime: 0 });
    const { result } = mount(el);

    act(() => {
      result.current.seekTo(10);
      result.current.seekTo(20);
      result.current.seekTo(30);
      result.current.seekTo(40);
    });

    // Only the first reached the element; the rest collapsed into one pending target.
    expect(writes).toEqual([10]);

    settle();

    expect(writes).toEqual([10, 40]);
  });

  it('discards intermediate targets rather than replaying them', () => {
    const { el, writes, settle } = makeVideo({ currentTime: 0 });
    const { result } = mount(el);

    act(() => {
      for (let i = 1; i <= 50; i++) result.current.seekTo(i);
    });
    settle();

    expect(writes).toEqual([1, 50]);
  });

  it('does not re-seek when the pending target is where it already landed', () => {
    const { el, writes, settle } = makeVideo({ currentTime: 0 });
    const { result } = mount(el);

    act(() => {
      result.current.seekTo(25);
      result.current.seekTo(25);
    });
    settle();

    expect(writes).toEqual([25]);
  });

  it('accepts a new seek once the previous one has settled', () => {
    const { el, writes, settle } = makeVideo({ currentTime: 0 });
    const { result } = mount(el);

    act(() => result.current.seekTo(10));
    settle();
    act(() => result.current.seekTo(20));

    expect(writes).toEqual([10, 20]);
  });

  /**
   * `seeked` is dropped if the source is replaced mid-seek, which the engine's quality
   * switches and reload recovery both do. Without the timeout the gate would stay shut and
   * strand every later seek.
   */
  it('reopens the gate if seeked never arrives', () => {
    const { el, writes } = makeVideo({ currentTime: 0 });
    const { result } = mount(el);

    act(() => result.current.seekTo(10));
    act(() => result.current.seekTo(20));
    expect(writes).toEqual([10]);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(writes).toEqual([10, 20]);
  });
});
