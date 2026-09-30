/**
 * Regression tests for AUDIT.md WP-H3 — seat claims were stamped from the device clock.
 *
 * Contests are decided by comparing `at` across clients, which silently assumed their clocks agreed. They
 * do not: a device a few seconds slow won every contest it entered and evicted members who were already
 * seated, through no fault of anyone's. Every client agreed, because they were all applying a correct rule
 * to a wrong number.
 *
 * Claims are now stamped from the party's shared timebase (`Date.now() + clockOffset`, the offset
 * `useClockSync` maintains), which reduces the spread between clients from device-clock drift — unbounded
 * — to network latency.
 *
 * **This closes the accidental case, not the deliberate one.** A client that lies about `at` still wins;
 * only an arbiter could stop that, and that reverses the no-referee design the seating model argues for.
 * The residual is pinned in `wp-h3-seat-claim-forgery.test.ts`.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeatOccupancy } from '@/features/watch-party/theatre/hooks/use-seat-occupancy';
import { SEAT_IDS } from '@/features/watch-party/theatre/lib/layout';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

const NOW = 1_700_000_000_000;

/**
 * Captures the SEAT_CLAIM messages a claim publishes.
 *
 * More than one arrives per mount: the hook also seats the user automatically and re-asserts its own
 * claim when the roster changes. That is why these tests assert that *every* stamp is on the shared
 * timebase rather than counting them — the count is not the property under test, and pinning it would
 * make the test fail on unrelated changes to auto-seating.
 */
function mount(clockOffset?: number) {
  const sent: Array<{ type: string; at?: number; seatId?: string | null }> = [];
  const hook = renderHook(() =>
    useSeatOccupancy({
      userId: 'u1',
      clockOffset,
      rtmSendMessage: ((m: { type: string }) => sent.push(m as never)) as never,
      enabled: true,
      active: true,
      memberIds: ['u1'],
    }),
  );
  return { hook, sent };
}

function claimStamps(sent: Array<{ type: string; at?: number }>): number[] {
  return sent.filter((m) => m.type === 'SEAT_CLAIM').map((m) => m.at as number);
}

/** Every claim published must carry the shared-timebase instant, whatever the device clock reads. */
function expectAllStamped(stamps: number[], expected: number) {
  expect(stamps.length).toBeGreaterThan(0);
  for (const stamp of stamps) expect(stamp).toBe(expected);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe('WP-H3 — seat claims use the shared timebase', () => {
  it('stamps from the device clock when no offset is known', () => {
    const { hook, sent } = mount(undefined);

    act(() => {
      hook.result.current.claimSeat(SEAT_IDS[0]);
    });

    expectAllStamped(claimStamps(sent), NOW);
  });

  /*
    The case that matters. A device five seconds slow used to publish `NOW - 5000` and so beat every
    punctual member. With the party offset applied, it publishes the shared time instead.
  */
  it('corrects a device clock that is five seconds slow', () => {
    // The device reads NOW - 5000; clock sync has measured it as 5s behind the party.
    vi.setSystemTime(NOW - 5000);
    const { hook, sent } = mount(5000);

    act(() => {
      hook.result.current.claimSeat(SEAT_IDS[0]);
    });

    expectAllStamped(claimStamps(sent), NOW);
  });

  it('corrects a device clock that runs fast', () => {
    vi.setSystemTime(NOW + 3000);
    const { hook, sent } = mount(-3000);

    act(() => {
      hook.result.current.claimSeat(SEAT_IDS[0]);
    });

    expectAllStamped(claimStamps(sent), NOW);
  });

  /*
    Two devices with clocks four seconds apart must now publish the same stamp for a simultaneous grab, so
    the tie-break decides it rather than whose clock is further behind.
  */
  it('makes two skewed devices agree on the instant', () => {
    vi.setSystemTime(NOW - 4000);
    const slow = mount(4000);
    act(() => {
      slow.hook.result.current.claimSeat(SEAT_IDS[0]);
    });

    vi.setSystemTime(NOW);
    const punctual = mount(0);
    act(() => {
      punctual.hook.result.current.claimSeat(SEAT_IDS[0]);
    });

    expectAllStamped(claimStamps(slow.sent), NOW);
    expectAllStamped(claimStamps(punctual.sent), NOW);
  });

  /* Standing up must carry a stamp on the same timebase, or a later sit-down could lose to it. */
  it('stamps standing up on the shared timebase too', () => {
    vi.setSystemTime(NOW - 2000);
    const { hook, sent } = mount(2000);

    act(() => {
      hook.result.current.claimSeat(SEAT_IDS[0]);
    });
    act(() => {
      hook.result.current.claimSeat(null);
    });

    expectAllStamped(claimStamps(sent), NOW);
  });
});
