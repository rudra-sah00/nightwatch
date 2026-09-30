/**
 * Regression tests for AUDIT.md WP-H1 — the floating-emoji list grew without bound.
 *
 * Entries left only on their own 4.5 s timer, which bounds nothing when arrivals outpace expiry,
 * and every entry is a live animated DOM node. Emoji is one of the RTM kinds with no permission to
 * consult, so there was nothing to revoke once a flood started.
 *
 * Written as observation tests first, and the observation corrected the finding. The audit claimed
 * a held-down or repeated tap produces unbounded animations; it does not, because the receive path
 * de-duplicates on `messageId || `${emoji}-${userName}-${bucket500ms}`` and the sender never sets
 * `messageId`, so repeated taps of one emoji by one user collapse to roughly two per second. What
 * the dedup does *not* constrain is either axis of its own key:
 *
 *   - 500 distinct emoji strings produced 500 simultaneous entries
 *   - 200 senders of the same emoji produced 200
 *
 * and a 100,000-character string was accepted as an emoji and stored verbatim.
 *
 * Fixed with a ceiling on concurrent entries and a shape check on the inbound payload. No send-side
 * throttle was added: that would change what a rapid tapper experiences, which is a UX decision
 * rather than a defect fix.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloatingEmojis } from '@/features/watch-party/interactions/hooks/use-floating-emojis';
import { dispatchRtmMessage } from '@/features/watch-party/room/services/rtm-events';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

/** Mirrors what `use-emoji-reactions.ts` puts on the wire — note it never sets `messageId`. */
function emoji(e: unknown, userName = 'G1') {
  return {
    type: 'INTERACTION',
    kind: 'emoji',
    emoji: e,
    userId: 'G1',
    userName,
  } as unknown as RTMMessage;
}

/** The ceiling in the hook. Duplicated deliberately — a test that reads the constant proves nothing. */
const MAX_ACTIVE_EMOJIS = 40;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WP-H1 — floating emoji bounds', () => {
  it('spawns a normal reaction', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      dispatchRtmMessage(emoji('🔥'));
    });
    expect(result.current.activeEmojis.length).toBe(1);
  });

  /* The pre-existing dedup, asserted so a change to the cap cannot silently remove it. */
  it('still collapses repeats of one emoji from one sender', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 50; i++) dispatchRtmMessage(emoji('🔥'));
    });
    expect(result.current.activeEmojis.length).toBe(1);
  });

  /* The first axis the dedup does not constrain: 500 distinct strings used to mean 500 nodes. */
  it('caps a flood of distinct emoji', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 500; i++) dispatchRtmMessage(emoji(`e${i}`));
    });
    expect(result.current.activeEmojis.length).toBe(MAX_ACTIVE_EMOJIS);
  });

  /* The second axis, and the one a real party can hit: many senders, one emoji. */
  it('caps a flood from many senders', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 200; i++) dispatchRtmMessage(emoji('🔥', `user${i}`));
    });
    expect(result.current.activeEmojis.length).toBe(MAX_ACTIVE_EMOJIS);
  });

  /*
    Which entries survive matters: the newest, since the oldest are furthest through their
    animation and least disruptive to lose.
  */
  it('keeps the most recent arrivals when it trims', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 60; i++) dispatchRtmMessage(emoji(`e${i}`));
    });
    const kept = result.current.activeEmojis.map((e) => e.emoji);
    expect(kept).toContain('e59');
    expect(kept).not.toContain('e0');
  });

  it.each([
    ['a 100k-character string', 'A'.repeat(100_000)],
    ['a 33-character string', 'A'.repeat(33)],
    ['a number', 7],
    ['an object', { a: 1 }],
  ])('rejects %s as an emoji', (_label, value) => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      dispatchRtmMessage(emoji(value));
    });
    expect(result.current.activeEmojis.length).toBe(0);
  });

  /* A long ZWJ sequence is a legitimate emoji and must survive the length check. */
  it('accepts a multi-codepoint family emoji', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    const family = '👨‍👩‍👧‍👦';
    expect(family.length).toBeLessThanOrEqual(32);
    act(() => {
      dispatchRtmMessage(emoji(family));
    });
    expect(result.current.activeEmojis.length).toBe(1);
  });

  /* The cap must not break ordinary expiry — this is a ceiling, not a leak fix. */
  it('still clears everything once the animations finish', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 100; i++) dispatchRtmMessage(emoji(`e${i}`));
    });
    expect(result.current.activeEmojis.length).toBe(MAX_ACTIVE_EMOJIS);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.activeEmojis.length).toBe(0);
  });

  /* And the party recovers: after a flood drains, new reactions still show. */
  it('accepts new reactions after a flood has drained', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    act(() => {
      for (let i = 0; i < 100; i++) dispatchRtmMessage(emoji(`e${i}`));
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.setSystemTime(10_000);
      dispatchRtmMessage(emoji('🎉'));
    });
    expect(result.current.activeEmojis.length).toBe(1);
  });
});
