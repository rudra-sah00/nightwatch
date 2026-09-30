/**
 * Regression tests for SEEKING.md D9 / P0 #4 — two components independently decided that
 * playback had failed.
 *
 * `use-video-element` started a 1200 ms timer on any `MEDIA_ERR_DECODE` and then dispatched
 * `SET_ERROR: 'Video playback error'`, while the active engine handled the very same event.
 * The engine nearly always lost the race: `hls.recoverMediaError()` rebuilds the
 * MediaSource and needs at least one fragment fetch, and the `onStreamExpired` path makes a
 * full backend round-trip — both routinely longer than 1200 ms. `clearPendingError` on
 * `playing`/`canplay` cancelled the toast when recovery was quick, but a reload-based
 * recovery cannot be quick. So the user saw an error for a failure the player then silently
 * recovered from, and before the reducer fix it could strand them on a spinner.
 *
 * Every engine already owns this decision — `useHls` for MSE and native HLS, `useMp4` and
 * `useDash` on their own paths — so the element-level handler now reports the signal and
 * decides nothing.
 */
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));

vi.mock('@/lib/analytics', () => ({
  trackEvent: mockTrackEvent,
  reportError: vi.fn(),
}));

import { useVideoElement } from '@/features/watch/player/ui/use-video-element';

/** Minimal MediaError global — happy-dom does not provide one. */
beforeEach(() => {
  vi.useFakeTimers();
  mockTrackEvent.mockClear();
  globalThis.MediaError = {
    MEDIA_ERR_ABORTED: 1,
    MEDIA_ERR_NETWORK: 2,
    MEDIA_ERR_DECODE: 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
  } as unknown as typeof MediaError;
});

/**
 * Mounts the hook the way production does — the ref attached to a real `<video>` through
 * JSX, so React assigns it before effects run and the listeners actually bind. Calling
 * `mergedRef` after `renderHook` would be too late: the listener effect is keyed on
 * `[dispatch, onTimeUpdate, onDurationChange]` and reads `videoRef.current`, so it would
 * have already bailed on a null ref.
 */
function mount() {
  const dispatch = vi.fn();
  let video: HTMLVideoElement | null = null;

  function Harness() {
    const { mergedRef } = useVideoElement({ dispatch });
    return (
      // biome-ignore lint/a11y/useMediaCaption: no captions needed in a unit test
      <video
        ref={(el) => {
          mergedRef(el);
          video = el;
        }}
      />
    );
  }

  render(<Harness />);
  if (!video) throw new Error('video element not mounted');
  return { dispatch, video: video as HTMLVideoElement };
}

/** Raises a decode error on the element, as a failed append does. */
function raiseDecodeError(video: HTMLVideoElement) {
  Object.defineProperty(video, 'error', {
    configurable: true,
    value: { code: 3, message: 'decode failed' },
  });
  act(() => {
    video.dispatchEvent(new Event('error'));
  });
}

describe('element decode errors report but do not decide (SEEKING.md D9)', () => {
  it('does not dispatch SET_ERROR when the element reports a decode error', () => {
    const { dispatch, video } = mount();

    raiseDecodeError(video);

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_ERROR',
        error: 'Video playback error',
      }),
    );
  });

  /** The defect: the error surfaced 1200 ms later, mid-recovery. */
  it('still dispatches nothing once the old 1200 ms window has passed', () => {
    const { dispatch, video } = mount();

    raiseDecodeError(video);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_ERROR',
        error: 'Video playback error',
      }),
    );
  });

  /** The signal is still worth having: it is the open-GOP `is_key_frame=0` signature. */
  it('reports the decode error to analytics instead', () => {
    const { video } = mount();

    raiseDecodeError(video);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'video_element_decode_error',
      expect.objectContaining({ mediaErrorCode: 3 }),
    );
  });

  it('ignores non-decode errors, as before', () => {
    const { video } = mount();
    Object.defineProperty(video, 'error', {
      configurable: true,
      value: { code: 2, message: 'network' },
    });

    act(() => {
      video.dispatchEvent(new Event('error'));
    });

    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'video_element_decode_error',
      expect.anything(),
    );
  });

  /** Clearing the error on recovery is still the element's job. */
  it('still clears the error when playback resumes', () => {
    const { dispatch, video } = mount();

    act(() => {
      video.dispatchEvent(new Event('playing'));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', error: null });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_BUFFERING',
      isBuffering: false,
    });
  });
});
