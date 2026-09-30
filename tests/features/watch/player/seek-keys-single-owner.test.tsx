/**
 * Regression tests for SEEKING.md D1 — one arrow press must produce exactly one seek.
 *
 * `PlayerRoot` renders a `tabIndex={0}` container with its own `onKeyDown`, and
 * `useKeyboard` binds `keydown` at **window** level. Both run for a single keypress:
 * the container's React handler fires during the bubble phase, then the same native
 * event reaches `window`. Neither calls `stopPropagation`, and the window handler's
 * only target filter is `HTMLInputElement`/`HTMLTextAreaElement`, which a focused
 * `<div tabIndex={0}>` passes.
 *
 * So the playhead moved twice per press, from two different bases with two different
 * semantics — `PlayerRoot` absolute from ~250 ms-stale React state, `useKeyboard`
 * relative from live `video.currentTime`. The auto-repeat guard added in `312a84df`
 * only covers the window handler, so holding a key bypassed it through the
 * container's copy.
 *
 * These tests measure the quantity the decode errors actually care about: how many
 * times `video.currentTime` is assigned for one user gesture. Each write emits a
 * `seeking` event, and it is `seeking` that makes hls.js abort in-flight fragments and
 * re-prime the buffer — so this is the local equivalent of the `seeksInLastSecond`
 * field SEEKING.md §7 proposes to measure in the field.
 *
 * `PlayerRoot.tsx` already documents this ownership rule for Space. The arrows and
 * J/L must follow it.
 */
import { fireEvent, render } from '@testing-library/react';
import type { RefObject } from 'react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialPlayerState } from '@/features/watch/player/context/types';
import { useKeyboard } from '@/features/watch/player/hooks/useKeyboard';
import { useSeekController } from '@/features/watch/player/hooks/useSeekController';
import { PlayerRoot } from '@/features/watch/player/ui/compound/PlayerRoot';

vi.mock('@/features/watch/player/hooks/useMobileDetection', () => ({
  useMobileDetection: () => false,
}));

const metadata = {
  title: 'Test',
  type: 'movie' as const,
  movieId: 'test-movie-1',
};

/** The element both owners write to, shared so writes can be counted in one place. */
let video: HTMLVideoElement;
/** Every `currentTime` assignment, in order. */
let writes: number[];
/** React's view of the playhead, pinned to simulate `SET_TIME`'s ~250 ms lag (D6). */
let staleStateTime: number;

/**
 * `usePlayerRoot` is mocked so the container's `seek` writes `currentTime` exactly as
 * the real `usePlayerHandlers.handleSeek` does (`usePlayerHandlers.ts:173`:
 * `videoRef.current.currentTime = time`), and so `state.currentTime` can be pinned to
 * a stale value independently of the element.
 */
vi.mock('@/features/watch/player/ui/compound/hooks/use-player-root', () => ({
  usePlayerRoot: () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const state = { ...initialPlayerState, currentTime: staleStateTime };
    return {
      state,
      containerRef,
      showControls: vi.fn(),
      contextValue: {
        state,
        dispatch: vi.fn(),
        metadata,
        streamUrl: null,
        videoRef: { current: video },
        hlsRef: { current: null },
        videoCallbackRef: vi.fn(),
        containerRef,
        playerHandlers: {
          // Absolute write, mirroring usePlayerHandlers.handleSeek.
          seek: (time: number) => {
            video.currentTime = time;
          },
          setVolume: vi.fn(),
          toggleMute: vi.fn(),
          toggleFullscreen: vi.fn(),
        },
      },
    };
  },
}));

/** A video stand-in that records every `currentTime` assignment. */
function makeVideo(startAt: number) {
  const recorded: number[] = [];
  const listeners = new Map<string, Set<EventListener>>();
  let current = startAt;
  const el = {
    get currentTime() {
      return current;
    },
    set currentTime(t: number) {
      current = t;
      recorded.push(t);
      // The element fires `seeked` when a seek completes; `useSeekController` gates its
      // one-in-flight window on it, so the stub has to emit it or the gate never reopens.
      for (const fn of listeners.get('seeked') ?? []) {
        fn(new Event('seeked'));
      }
    },
    duration: 600,
    seekable: { length: 0, start: () => 0, end: () => 0 },
    buffered: { length: 0, start: () => 0, end: () => 0 },
    addEventListener: (type: string, fn: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      listeners.get(type)?.delete(fn);
    },
  } as unknown as HTMLVideoElement;
  return { el, recorded };
}

/**
 * Mounts the real `PlayerRoot` alongside the real window-level `useKeyboard` against
 * one shared element — the production arrangement, where `usePlayerRoot` calls
 * `useKeyboard` internally.
 */
function Harness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = { current: video } as RefObject<HTMLVideoElement | null>;

  // The real controller, so this exercises the whole chain the user's keypress travels:
  // window listener → useKeyboard → useSeekController → element.
  const { seekBy } = useSeekController({ videoRef });

  useKeyboard({
    videoRef,
    containerRef,
    dispatch: vi.fn(),
    seekBy,
    isFullscreen: false,
    onBack: vi.fn(),
    currentSubtitleTrack: null,
    onToggleCaptions: vi.fn(),
    hasNextEpisode: false,
    onNextEpisode: vi.fn(),
  });

  return (
    <PlayerRoot streamUrl="https://example.test/a.m3u8" metadata={metadata}>
      <div>child</div>
    </PlayerRoot>
  );
}

/** Renders the harness and returns the player container. */
function renderPlayer() {
  const { container } = render(<Harness />);
  const root = container.querySelector('[role="application"]');
  if (!root) throw new Error('player container not found');
  return root;
}

describe('seek keys — single owner (SEEKING.md D1)', () => {
  beforeEach(() => {
    const made = makeVideo(100);
    video = made.el;
    writes = made.recorded;
    staleStateTime = 100;
  });

  it.each([
    ['ArrowLeft', 'ArrowLeft'],
    ['ArrowRight', 'ArrowRight'],
    ['j', 'KeyJ'],
    ['l', 'KeyL'],
  ])('writes currentTime exactly once for one "%s" press', (key, code) => {
    fireEvent.keyDown(renderPlayer(), { key, code });

    expect(writes).toHaveLength(1);
  });

  /**
   * The surviving write must be the relative one computed from live
   * `video.currentTime`, not the absolute one computed from stale React state (D6).
   * Pinning the state 30 s behind the element separates them: the correct owner lands
   * at 90, the stale one at 60.
   */
  it('seeks relative to the live playhead, not to stale React state', () => {
    staleStateTime = 70;

    fireEvent.keyDown(renderPlayer(), { key: 'ArrowLeft', code: 'ArrowLeft' });

    expect(writes).toEqual([90]);
  });

  /**
   * `312a84df`'s auto-repeat guard lives in `useKeyboard`. It only holds if the
   * container has no second, unguarded handler behind it.
   */
  it('does not seek again on auto-repeat while an arrow is held', () => {
    const root = renderPlayer();

    fireEvent.keyDown(root, { key: 'ArrowLeft', code: 'ArrowLeft' });
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(root, {
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        repeat: true,
      });
    }

    expect(writes).toHaveLength(1);
  });

  /**
   * Volume keys are not seek keys and must never move the playhead. Guards against
   * over-correcting by gutting the container handler entirely.
   */
  it('does not move the playhead for volume keys', () => {
    fireEvent.keyDown(renderPlayer(), { key: 'ArrowUp', code: 'ArrowUp' });

    expect(writes).toHaveLength(0);
  });
});
