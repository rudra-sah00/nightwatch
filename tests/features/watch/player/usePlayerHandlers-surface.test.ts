/**
 * Regression test for PLAYER_AUDIT H7 — `usePlayerHandlers` exported a `handleRetry`
 * that nothing consumed and that could not have worked if it had been wired up.
 *
 * It cleared `error` and set `isLoading: true`, and stopped there. Every engine hook
 * (`useHls`, `useMp4`, `useDash`) keys its main effect on `streamUrl`, so nothing
 * re-created the engine: wiring it to `ErrorOverlay`'s `onRetry` would have traded the
 * error message for an indefinite spinner over a dead MediaSource. `use-player-root`
 * never destructured it and it never reached `playerHandlers`, so the overlay used
 * `window.location.reload()` instead.
 *
 * Reload stays, deliberately, and is now commented as such at both call sites. This test
 * pins the handler surface so a no-op retry cannot quietly return: the cheap fix is an
 * engine nonce threaded through `usePlayerEngine`, not a state reset.
 */
import { renderHook } from '@testing-library/react';
import type { Dispatch } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerAction } from '@/features/watch/player/context/types';
import { usePlayerHandlers } from '@/features/watch/player/hooks/usePlayerHandlers';

/** The handlers the player genuinely relies on. */
const EXPECTED_HANDLERS = [
  'showControls',
  'handleInteraction',
  'handleSeek',
  'handleSkip',
  'handleVolumeChange',
  'handleMuteToggle',
  'handleTogglePlay',
  'handleVideoClick',
  'handleQualityChange',
  'handlePlaybackRateChange',
  'handleAudioChange',
  'handleSubtitleChange',
] as const;

function mount() {
  const video = document.createElement('video');
  return renderHook(() =>
    usePlayerHandlers({
      videoRef: { current: video },
      dispatch: vi.fn() as unknown as Dispatch<PlayerAction>,
      isPlaying: false,
      isPaused: true,
      togglePlay: vi.fn(),
      toggleMute: vi.fn(),
      seekTo: vi.fn(),
      seekBy: vi.fn(),
      setQuality: vi.fn(),
      setAudioTrack: vi.fn(),
      qualities: [],
    }),
  );
}

describe('usePlayerHandlers surface (PLAYER_AUDIT H7)', () => {
  it('does not expose a retry handler', () => {
    const { result } = mount();

    expect(result.current).not.toHaveProperty('handleRetry');
  });

  it('exposes exactly the handlers the player consumes', () => {
    const { result } = mount();

    expect(Object.keys(result.current).sort()).toEqual(
      [...EXPECTED_HANDLERS].sort(),
    );
  });

  /** Guards against removing a live handler while deleting the dead one. */
  it('still exposes every handler as a function', () => {
    const { result } = mount();

    for (const name of EXPECTED_HANDLERS) {
      expect(typeof result.current[name]).toBe('function');
    }
  });
});
