/**
 * Tests for the mobile long-press-to-speed-up gesture.
 *
 * Mirrors the Space-key contract: hold the video for 250ms to get 2x, lift to restore.
 * The boost rules themselves live in `usePlaybackSpeedBoost` and are shared, so these
 * cover the gesture recognition: hold threshold, swipe cancellation, multi-touch,
 * interruption, and suppressing the tap action after a real hold.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPressSpeedBoost } from '@/features/watch/player/hooks/useLongPressSpeedBoost';

const HOLD_MS = 250;

function touch(x: number, y: number) {
  return { clientX: x, clientY: y };
}

function touchEvent(points: Array<{ clientX: number; clientY: number }>) {
  return { touches: points } as unknown as React.TouchEvent;
}

function setup(enabled = true, engageResult = true) {
  const engageSpeedBoost = vi.fn(() => engageResult);
  const releaseSpeedBoost = vi.fn();
  const { result, unmount } = renderHook(() =>
    useLongPressSpeedBoost({ engageSpeedBoost, releaseSpeedBoost, enabled }),
  );
  return { result, unmount, engageSpeedBoost, releaseSpeedBoost };
}

describe('useLongPressSpeedBoost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('boosts after holding past the threshold', () => {
    const { result, engageSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    expect(engageSpeedBoost).toHaveBeenCalledTimes(1);
    expect(result.current.didBoost()).toBe(true);
  });

  it('does not boost on a quick tap', () => {
    const { result, engageSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(80);
      result.current.longPressHandlers.onTouchEnd();
    });

    expect(engageSpeedBoost).not.toHaveBeenCalled();
    expect(result.current.didBoost()).toBe(false);
  });

  it('restores on lift', () => {
    const { result, releaseSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
      result.current.longPressHandlers.onTouchEnd();
    });

    expect(releaseSpeedBoost).toHaveBeenCalled();
  });

  it('abandons the press when the finger swipes (scroll / seek drag)', () => {
    const { result, engageSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      result.current.longPressHandlers.onTouchMove(
        touchEvent([touch(100, 140)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    expect(engageSpeedBoost).not.toHaveBeenCalled();
  });

  it('tolerates small jitter without abandoning the press', () => {
    const { result, engageSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      result.current.longPressHandlers.onTouchMove(
        touchEvent([touch(104, 103)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    expect(engageSpeedBoost).toHaveBeenCalledTimes(1);
  });

  it('ignores multi-touch (pinch/zoom)', () => {
    const { result, engageSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100), touch(200, 200)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    expect(engageSpeedBoost).not.toHaveBeenCalled();
  });

  it('is inert when disabled (desktop, or read-only viewers)', () => {
    const { result, engageSpeedBoost } = setup(false);

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    expect(engageSpeedBoost).not.toHaveBeenCalled();
  });

  it('reports no boost when the boost was refused (paused / live)', () => {
    const { result } = setup(true, false);

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    // Caller must still fire its tap action, so a hold on a paused video plays it.
    expect(result.current.didBoost()).toBe(false);
  });

  it('releases when the touch is cancelled', () => {
    const { result, releaseSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
      result.current.longPressHandlers.onTouchCancel();
    });

    expect(releaseSpeedBoost).toHaveBeenCalled();
  });

  it('releases when the app is backgrounded mid-press', () => {
    const { result, releaseSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(releaseSpeedBoost).toHaveBeenCalled();
  });

  it('releases on unmount mid-press', () => {
    const { result, unmount, releaseSpeedBoost } = setup();

    act(() => {
      result.current.longPressHandlers.onTouchStart(
        touchEvent([touch(100, 100)]),
      );
      vi.advanceTimersByTime(HOLD_MS + 10);
    });

    unmount();

    expect(releaseSpeedBoost).toHaveBeenCalled();
  });
});
