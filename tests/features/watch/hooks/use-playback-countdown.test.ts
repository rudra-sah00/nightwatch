/**
 * Regression tests for PLAYER_AUDIT H4 — a mistimed unmount left the whole app
 * unscrollable.
 *
 * `usePlaybackCountdown` locks `document.body.style.overflow` for the duration of the
 * 3-2-1 countdown and restores it afterwards. The effect has two return paths, and only
 * one of them restored:
 *
 * ```ts
 * if (count <= 0) {
 *   const finalTimeout = setTimeout(() => { … restore … }, 500);
 *   return () => clearTimeout(finalTimeout);   // ← no restore
 * }
 * …
 * return () => { …; document.body.style.overflow = originalStyle; };  // ← restores
 * ```
 *
 * Unmounting inside that 500 ms window — back navigation, a route change, the parent
 * hiding the countdown — cancelled the timeout and left `overflow: hidden` on `<body>`,
 * so every subsequent page in the SPA session was unscrollable until a full reload.
 *
 * It compounded with M15. `originalStyle` is re-captured on every effect run, and React
 * runs the previous cleanup before the next effect body — so the capture is only correct
 * while every branch restores. Because this branch did not, a re-run inside the window
 * (the effect depends on `onComplete`, which the only caller passes as an inline arrow)
 * captured `'hidden'` as the original and the timeout then "restored" the lock
 * permanently, with no unmount needed at all.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaybackCountdown } from '@/features/watch/hooks/use-playback-countdown';

/** Counter reaches 0 after 3 ticks, then waits 500 ms before calling onComplete. */
const TICKS_TO_ZERO = 3000;
const FINAL_DELAY = 500;

describe('usePlaybackCountdown body scroll lock (PLAYER_AUDIT H4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  /** Sanity: the lock is applied while counting, otherwise the rest proves nothing. */
  it('locks body scroll while counting down', () => {
    renderHook(() => usePlaybackCountdown(vi.fn()));

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores scroll when unmounted mid-countdown', () => {
    const { unmount } = renderHook(() => usePlaybackCountdown(vi.fn()));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    unmount();

    expect(document.body.style.overflow).not.toBe('hidden');
  });

  /** The defect: unmount after the counter hits zero but before the 500 ms elapses. */
  it('restores scroll when unmounted inside the final 500 ms window', () => {
    const onComplete = vi.fn();
    const { unmount } = renderHook(() => usePlaybackCountdown(onComplete));

    act(() => {
      vi.advanceTimersByTime(TICKS_TO_ZERO);
    });
    act(() => {
      vi.advanceTimersByTime(FINAL_DELAY - 100);
    });
    // Still inside the window — onComplete has not fired yet.
    expect(onComplete).not.toHaveBeenCalled();

    unmount();

    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores scroll on the normal completion path', () => {
    const onComplete = vi.fn();
    renderHook(() => usePlaybackCountdown(onComplete));

    // Separate acts: React has to commit count === 0 before the effect re-runs and
    // arms the final timeout, so advancing both spans at once would never reach it.
    act(() => {
      vi.advanceTimersByTime(TICKS_TO_ZERO);
    });
    act(() => {
      vi.advanceTimersByTime(FINAL_DELAY);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  /**
   * The compound case with M15: an unstable `onComplete` re-runs the effect inside the
   * final window. Without a restore in that branch's cleanup, the re-run captured
   * `'hidden'` as the original and the lock survived completion.
   */
  it('restores scroll even when the effect re-runs inside the final window', () => {
    const { rerender } = renderHook(
      ({ onComplete }: { onComplete: () => void }) =>
        usePlaybackCountdown(onComplete),
      { initialProps: { onComplete: vi.fn() } },
    );

    act(() => {
      vi.advanceTimersByTime(TICKS_TO_ZERO);
    });
    // New identity, exactly as content-detail-modal.tsx's inline arrow produces.
    rerender({ onComplete: vi.fn() });
    act(() => {
      vi.advanceTimersByTime(FINAL_DELAY);
    });

    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('counts down from 3 to 0', () => {
    const { result } = renderHook(() => usePlaybackCountdown(vi.fn()));

    expect(result.current.count).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.count).toBe(2);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(0);
  });
});
