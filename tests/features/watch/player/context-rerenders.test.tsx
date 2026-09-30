/**
 * Re-render measurement for PLAYER_AUDIT H5 — the player subtree re-rendered at ~4Hz.
 *
 * `SET_TIME` is dispatched from `timeupdate`, roughly four times a second. Each dispatch produced
 * a new `state`, a new context value identity, and invalidated every `usePlayerContext()`
 * consumer — 32 of them across 26 files — including the 18 that read only handlers, refs and
 * metadata and have no interest in the playhead. On Android TV and older phones that showed up as
 * dropped frames and laggy controls.
 *
 * Two things make the fix work, and both are asserted here:
 *
 * 1. The split. `PlayerContext` now carries only `{ state }`; everything stable lives in
 *    `PlayerStableContext`. A consumer reading `usePlayerControls()` does not subscribe to the
 *    state context and so is not woken by a time update.
 * 2. The memo. If the stable value were rebuilt each render it would get a new identity and every
 *    consumer would re-render anyway — the split alone buys nothing.
 *
 * Children are created once, outside the provider's render, because that is how production works:
 * `PlayerRoot` owns the state and re-renders at 4Hz, but its `children` come from
 * `WatchVODPlayer`, which does not — so React's element-identity bailout already spares the
 * subtree, and context subscription is what actually propagates the update.
 */
import { act, render } from '@testing-library/react';
import { type ReactNode, useMemo, useReducer } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PlayerContext,
  PlayerStableContext,
  usePlayerContext,
  usePlayerControls,
} from '@/features/watch/player/context/PlayerContext';
import {
  initialPlayerState,
  type PlayerAction,
  playerReducer,
} from '@/features/watch/player/context/types';

const metadata = { title: 'T', type: 'movie' as const, movieId: 'm1' };

const controlsRenders = vi.fn();
const stateRenders = vi.fn();

/** Reads only handlers — the shape 18 of the player's consumers have. */
function ControlsConsumer() {
  usePlayerControls();
  controlsRenders();
  return null;
}

/** Reads the playhead, so it must re-render. */
function StateConsumer() {
  const { state } = usePlayerContext();
  stateRenders();
  return <span>{state.currentTime}</span>;
}

/** Created once, so element identity cannot be what triggers a re-render. */
const CHILDREN = (
  <>
    <ControlsConsumer />
    <StateConsumer />
  </>
);

let dispatchRef: React.Dispatch<PlayerAction> | null = null;

/** The stable half, as `use-player-root` assembles it. */
function buildStable(dispatch: React.Dispatch<PlayerAction>) {
  return {
    dispatch,
    metadata,
    streamUrl: null,
    videoRef: { current: null },
    hlsRef: { current: null },
    videoCallbackRef: vi.fn(),
    containerRef: { current: null },
    playerHandlers: {},
    nextEpisode: {},
  } as never;
}

/** Mirrors `use-player-root` + `PlayerRoot`: memoised stable half, volatile state half. */
function Root({
  children,
  memoiseStable = true,
}: {
  children: ReactNode;
  memoiseStable?: boolean;
}) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  dispatchRef = dispatch;

  const memoised = useMemo(() => buildStable(dispatch), []);
  // The unmemoised path builds a fresh object every render — the old behaviour.
  const stable = memoiseStable ? memoised : buildStable(dispatch);

  const stateValue = useMemo(() => ({ state }), [state]);

  return (
    <PlayerStableContext value={stable}>
      <PlayerContext value={stateValue}>{children}</PlayerContext>
    </PlayerStableContext>
  );
}

beforeEach(() => {
  controlsRenders.mockClear();
  stateRenders.mockClear();
});

describe('player context re-renders (PLAYER_AUDIT H5)', () => {
  it('does not wake a handlers-only consumer on SET_TIME', () => {
    render(<Root>{CHILDREN}</Root>);
    controlsRenders.mockClear();
    stateRenders.mockClear();

    act(() => {
      dispatchRef?.({ type: 'SET_TIME', time: 12 });
    });

    expect(controlsRenders).toHaveBeenCalledTimes(0);
  });

  /** The other half of the contract: consumers that show the playhead must still update. */
  it('still wakes a consumer that reads the playhead', () => {
    render(<Root>{CHILDREN}</Root>);
    controlsRenders.mockClear();
    stateRenders.mockClear();

    act(() => {
      dispatchRef?.({ type: 'SET_TIME', time: 12 });
    });

    expect(stateRenders).toHaveBeenCalledTimes(1);
  });

  it('stays quiet across a second of time updates', () => {
    render(<Root>{CHILDREN}</Root>);
    controlsRenders.mockClear();

    // Four dispatches is one second of playback at the timeupdate cadence.
    act(() => {
      for (let i = 1; i <= 4; i++) {
        dispatchRef?.({ type: 'SET_TIME', time: i });
      }
    });

    expect(controlsRenders).toHaveBeenCalledTimes(0);
  });

  /**
   * Proves the memo carries its weight. Without it the stable value is a new object on every
   * render of the provider, so the split alone would spare nobody.
   */
  it('wakes handlers-only consumers if the stable value is not memoised', () => {
    render(<Root memoiseStable={false}>{CHILDREN}</Root>);
    controlsRenders.mockClear();

    act(() => {
      dispatchRef?.({ type: 'SET_TIME', time: 12 });
    });

    expect(controlsRenders).toHaveBeenCalledTimes(1);
  });

  /** A non-time action that changes state must still reach the consumers that read it. */
  it('wakes state consumers for other actions too', () => {
    render(<Root>{CHILDREN}</Root>);
    stateRenders.mockClear();
    controlsRenders.mockClear();

    act(() => {
      dispatchRef?.({ type: 'SET_BUFFERING', isBuffering: true });
    });

    expect(stateRenders).toHaveBeenCalledTimes(1);
    expect(controlsRenders).toHaveBeenCalledTimes(0);
  });
});
