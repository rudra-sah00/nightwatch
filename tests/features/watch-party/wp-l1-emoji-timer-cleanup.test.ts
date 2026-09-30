/**
 * Regression test for AUDIT.md WP-L1 — the emoji dedup timers outlived unmount.
 *
 * `spawnEmoji`'s own removal timer is registered in `timeoutsRef` and cleared by the unmount effect.
 * The dedup-key expiry timer beside it was not, so it stayed pending after the hook went away.
 *
 * Harmless in effect — the callback only mutates a ref that is itself about to be collected — but it
 * is the same class of leak the sibling timer was deliberately tracked to avoid, so the asymmetry is
 * an oversight rather than a decision. Asserted on the pending-timer count, which is the only
 * observable difference.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloatingEmojis } from '@/features/watch-party/interactions/hooks/use-floating-emojis';
import { dispatchRtmMessage } from '@/features/watch-party/room/services/rtm-events';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

function emoji(e: string) {
  return {
    type: 'INTERACTION',
    kind: 'emoji',
    emoji: e,
    userId: 'G1',
    userName: 'G1',
  } as unknown as RTMMessage;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WP-L1 — emoji timers are cleared on unmount', () => {
  it('leaves no pending timers behind', () => {
    const { unmount } = renderHook(() => useFloatingEmojis());

    act(() => {
      for (let i = 0; i < 5; i++) dispatchRtmMessage(emoji(`e${i}`));
    });

    // Each arrival arms two timers: the entry's own removal, and the dedup key's expiry.
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  /* Dedup must still work while mounted — the fix is about cleanup, not about dropping the timer. */
  it('still expires dedup keys while mounted', () => {
    const { result } = renderHook(() => useFloatingEmojis());

    act(() => {
      dispatchRtmMessage(emoji('🔥'));
    });
    expect(result.current.activeEmojis).toHaveLength(1);

    // Past both the 4.5s animation and the 2s dedup window.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.activeEmojis).toHaveLength(0);

    // The same emoji is accepted again, so the dedup key really did expire.
    act(() => {
      vi.setSystemTime(10_000);
      dispatchRtmMessage(emoji('🔥'));
    });
    expect(result.current.activeEmojis).toHaveLength(1);
  });
});
