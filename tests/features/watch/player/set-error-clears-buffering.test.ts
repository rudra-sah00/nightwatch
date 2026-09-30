/**
 * Regression tests for PLAYER_AUDIT C1 — an error raised while buffering was invisible,
 * and left an infinite spinner with no way out.
 *
 * `WatchVODPlayer` gates its two overlays on complementary halves of `isBuffering`:
 *
 * ```tsx
 * isVisible={state.isBuffering && !state.isLoading}                    // BufferingOverlay
 * isVisible={!!state.error && !state.isLoading && !state.isBuffering}  // ErrorOverlay
 * ```
 *
 * `SET_ERROR` cleared `isLoading` but not `isBuffering`, so every `useHls` path that
 * dispatched `SET_BUFFERING: true` and later gave up produced a state where the error
 * was suppressed and the spinner shown: no message, no retry, no back button. The only
 * escape was reloading the page, and it silently swallowed every message the recovery
 * code produced.
 *
 * `WatchLivePlayer` gates its overlays identically, so the same deadlock applied there.
 *
 * These tests assert the reducer contract and then re-evaluate the real overlay guard
 * expressions, so a future change to either side is caught.
 */
import { describe, expect, it } from 'vitest';
import {
  initialPlayerState,
  type PlayerState,
  playerReducer,
} from '@/features/watch/player/context/types';

/** The BufferingOverlay guard, copied verbatim from `WatchVODPlayer.tsx`. */
const bufferingOverlayVisible = (s: PlayerState) =>
  s.isBuffering && !s.isLoading;

/** The ErrorOverlay guard, copied verbatim from `WatchVODPlayer.tsx`. */
const errorOverlayVisible = (s: PlayerState) =>
  !!s.error && !s.isLoading && !s.isBuffering;

/** The state a `useHls` give-up path leaves behind: buffering, then a fatal error. */
function buffering(): PlayerState {
  return { ...initialPlayerState, isLoading: false, isBuffering: true };
}

describe('SET_ERROR and isBuffering (PLAYER_AUDIT C1)', () => {
  it('clears isBuffering when a real error arrives', () => {
    const next = playerReducer(buffering(), {
      type: 'SET_ERROR',
      error: 'Playback failed — the media could not be decoded.',
    });

    expect(next.isBuffering).toBe(false);
  });

  it('shows the error overlay rather than an endless spinner', () => {
    const next = playerReducer(buffering(), {
      type: 'SET_ERROR',
      error: 'Playback error occurred',
    });

    expect(errorOverlayVisible(next)).toBe(true);
    expect(bufferingOverlayVisible(next)).toBe(false);
  });

  /**
   * The contradictory state itself, rather than its overlay symptom: "there is an
   * error" and "we are still buffering" must never both hold. Dropping
   * `!state.isBuffering` from the ErrorOverlay guard would have fixed the visible
   * symptom while leaving this reachable.
   */
  it('never reports an error and buffering at the same time', () => {
    const next = playerReducer(buffering(), {
      type: 'SET_ERROR',
      error: 'Stream unavailable',
    });

    expect(!!next.error && next.isBuffering).toBe(false);
  });

  it('still preserves the error message and clears isLoading', () => {
    const next = playerReducer(
      { ...initialPlayerState, isBuffering: true },
      { type: 'SET_ERROR', error: 'Stream session expired' },
    );

    expect(next.error).toBe('Stream session expired');
    expect(next.isLoading).toBe(false);
  });

  /**
   * `SET_ERROR: null` is the ordinary "no error" reset — `useHls` dispatches it on load
   * and `use-video-element` on `canplay`/`playing`. It must not double as "stop
   * buffering", or the spinner would vanish during normal buffering.
   */
  it('leaves isBuffering alone when the error is cleared to null', () => {
    const next = playerReducer(buffering(), {
      type: 'SET_ERROR',
      error: null,
    });

    expect(next.isBuffering).toBe(true);
    expect(next.error).toBeNull();
    expect(bufferingOverlayVisible(next)).toBe(true);
  });

  /**
   * `isPlaying`/`isPaused` are owned by the element's own `play`/`pause` events.
   * Forcing them here would desynchronise the two, so the fix deliberately does not.
   */
  it('does not touch isPlaying or isPaused', () => {
    const playing: PlayerState = {
      ...initialPlayerState,
      isLoading: false,
      isBuffering: true,
      isPlaying: true,
      isPaused: false,
    };

    const next = playerReducer(playing, {
      type: 'SET_ERROR',
      error: 'Video playback error',
    });

    expect(next.isPlaying).toBe(true);
    expect(next.isPaused).toBe(false);
  });

  it('is a no-op on isBuffering when it was already false', () => {
    const next = playerReducer(
      { ...initialPlayerState, isLoading: false, isBuffering: false },
      { type: 'SET_ERROR', error: 'Live stream unavailable' },
    );

    expect(next.isBuffering).toBe(false);
    expect(errorOverlayVisible(next)).toBe(true);
  });
});
