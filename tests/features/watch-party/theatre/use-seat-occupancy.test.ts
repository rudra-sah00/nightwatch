import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeatOccupancy } from '@/features/watch-party/theatre/hooks/use-seat-occupancy';
import {
  autoSeatOrder,
  type SeatId,
} from '@/features/watch-party/theatre/lib/layout';

/**
 * Seat occupancy across a 2D <-> 3D switch.
 *
 * The hook is mounted by `WatchPartyVideoArea`, above the view-mode switch, so
 * `active` going false and true again is the whole of what a `V` press does to it.
 * That is what these tests simulate — the scene unmounting must not cost you your
 * chair, and must not silently re-seat you if you chose to stand.
 */

/**
 * No module mocking any more.
 *
 * This suite used to mock `watch-party.api`'s `onSeatClaim`, `onMemberJoined` and
 * `onMemberLeft`, because the hook subscribed to an ambient RTM event bus. It no longer
 * subscribes to anything: claims are handed in through `acceptRemoteClaim` and
 * departures come from the roster it is already given. Driving it is now a function
 * call, which is both simpler and a closer match to how `WatchPartyVideoArea` wires it.
 */

/** Result of the hook, for the helpers below. */
type SeatHook = ReturnType<typeof useSeatOccupancy>;

function setup(
  overrides: Partial<Parameters<typeof useSeatOccupancy>[0]> = {},
) {
  /** Stands in for the relay: records the claim and stamps a server time. */
  const claimSeatOnRelay = vi.fn((_seatId: string | null) => Date.now());
  const view = renderHook(
    (props: { active: boolean }) =>
      useSeatOccupancy({
        userId: 'me',
        claimSeatOnRelay,
        memberIds: ['me', 'alice'],
        enabled: true,
        active: props.active,
        ...overrides,
      }),
    { initialProps: { active: true } },
  );

  /** A claim arriving from somebody else, or replayed by the relay in `hello`. */
  const incomingClaim = (userId: string, seatId: string | null, at: number) => {
    act(() => {
      (view.result.current as SeatHook).acceptRemoteClaim({
        userId,
        seatId,
        at,
      });
    });
  };

  return { ...view, claimSeatOnRelay, incomingClaim };
}

const claimsSent = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.map((c) => c[0] as string | null);

describe('useSeatOccupancy — entering 3D', () => {
  it('seats you the first time you enter, and tells the room', () => {
    // The spawn point is on the rear platform behind both rows, so an unseated
    // arrival's first frame is the backs of other people's heads.
    const { result, claimSeatOnRelay } = setup();
    expect(result.current.mySeat).toBe(autoSeatOrder('me')[0]);
    expect(claimsSent(claimSeatOnRelay)).toEqual([result.current.mySeat]);
  });

  it('does not seat anybody who is still in 2D', () => {
    const { result } = setup();
    expect(result.current.mySeat).not.toBeNull();

    const other = renderHook(() =>
      useSeatOccupancy({
        userId: 'watcher',
        memberIds: ['watcher'],
        enabled: true,
        active: false,
      }),
    );
    expect(other.result.current.mySeat).toBeNull();
  });

  it('waits for the roster rather than claiming into an empty room', () => {
    const { result } = setup({ memberIds: [] });
    expect(result.current.mySeat).toBeNull();
  });

  it('takes another seat when it loses the contest for the first one', () => {
    /*
      Claims are applied optimistically with no arbiter, so two people can grab one
      chair. The loser is bounced back to standing — and must then land somewhere,
      or entering together would leave people on their feet at random.
    */
    const { result, claimSeatOnRelay, incomingClaim } = setup();
    const first = result.current.mySeat as SeatId;

    // Somebody else got there a second earlier, which beats us on timestamp.
    incomingClaim('alice', first, 1);

    expect(result.current.seatMap[first]).toBe('alice');
    expect(result.current.mySeat).not.toBeNull();
    expect(result.current.mySeat).not.toBe(first);
    expect(claimsSent(claimSeatOnRelay)).toEqual([
      first,
      result.current.mySeat,
    ]);
  });
});

describe('useSeatOccupancy — 2D <-> 3D round trip', () => {
  it('keeps your seat through 3D -> 2D -> 3D, without re-claiming it', () => {
    const { result, rerender, claimSeatOnRelay } = setup();
    const seat = result.current.mySeat;
    expect(seat).not.toBeNull();

    rerender({ active: false }); // V, back to the flat player
    expect(result.current.mySeat).toBe(seat);

    rerender({ active: true }); // V, back into the room
    expect(result.current.mySeat).toBe(seat);

    // One claim in total. A second would carry a fresh timestamp and lose the
    // seat to anybody who has claimed more recently.
    expect(claimsSent(claimSeatOnRelay)).toEqual([seat]);
  });

  it('survives repeated switching', () => {
    const { result, rerender, claimSeatOnRelay } = setup();
    const seat = result.current.mySeat;

    for (let i = 0; i < 5; i += 1) {
      rerender({ active: false });
      rerender({ active: true });
    }

    expect(result.current.mySeat).toBe(seat);
    expect(claimsSent(claimSeatOnRelay)).toEqual([seat]);
  });

  it('leaves you standing if that is how you left, rather than re-seating you', () => {
    const { result, rerender } = setup();
    expect(result.current.mySeat).not.toBeNull();

    act(() => result.current.claimSeat(null)); // E, stand up
    expect(result.current.mySeat).toBeNull();

    rerender({ active: false });
    rerender({ active: true });
    expect(result.current.mySeat).toBeNull();
  });

  it('keeps the seat you chose by hand, not the one it picked for you', () => {
    const { result, rerender } = setup();
    const automatic = result.current.mySeat as SeatId;
    const chosen = autoSeatOrder('me').find((s) => s !== automatic) as SeatId;

    act(() => result.current.claimSeat(chosen));
    expect(result.current.mySeat).toBe(chosen);
    // A person holds at most one seat, or the old one blocks the chair for everyone.
    expect(result.current.seatMap[automatic]).toBeNull();

    rerender({ active: false });
    rerender({ active: true });
    expect(result.current.mySeat).toBe(chosen);
  });
});

describe('useSeatOccupancy — departures', () => {
  it('frees a chair the moment its occupant leaves the party', () => {
    /*
      The bug this closes. A claim that outlives its owner does not merely look wrong —
      the deterministic rule favours the EARLIEST timestamp, so a ghost claim beats every
      later one and that chair is reserved for somebody who has gone, for the rest of
      the party.

      Driven through the roster rather than a `MEMBER_LEFT` event, because that is what
      replaced it: the relay's roster IS presence, so a member absent from it has gone.
      There is no longer a separate departure signal to miss.
    */
    const { result, rerender, incomingClaim } = renderHook(
      (props: { memberIds: string[] }) =>
        useSeatOccupancy({
          userId: 'me',
          memberIds: props.memberIds,
          enabled: true,
          active: true,
        }),
      { initialProps: { memberIds: ['me', 'alice'] } },
    ) as unknown as {
      result: { current: SeatHook };
      rerender: (p: { memberIds: string[] }) => void;
      incomingClaim: never;
    };

    act(() => {
      result.current.acceptRemoteClaim({
        userId: 'alice',
        seatId: 'B5',
        at: 1,
      });
    });
    expect(result.current.seatMap.B5).toBe('alice');

    rerender({ memberIds: ['me'] });
    expect(result.current.seatMap.B5).toBeNull();
    void incomingClaim;
  });

  it('releases a seat held by someone the roster has dropped', () => {
    // Reconciling against the roster is the correctness guarantee behind the relay's
    // own optimisation: it does not matter whether an event fired or was missed,
    // because anyone absent from the roster loses their claim on the next pass.
    const { result, rerender } = renderHook(
      (props: { memberIds: string[] }) =>
        useSeatOccupancy({
          userId: 'me',
          memberIds: props.memberIds,
          enabled: true,
          active: true,
        }),
      { initialProps: { memberIds: ['me', 'alice'] } },
    );

    act(() => {
      result.current.acceptRemoteClaim({
        userId: 'alice',
        seatId: 'B5',
        at: 1,
      });
    });
    expect(result.current.seatMap.B5).toBe('alice');

    rerender({ memberIds: ['me'] });
    expect(result.current.seatMap.B5).toBeNull();
  });

  it('treats an empty roster as not loaded, so it never evicts the room', () => {
    const { result, rerender } = renderHook(
      (props: { memberIds: string[] }) =>
        useSeatOccupancy({
          userId: 'me',
          memberIds: props.memberIds,
          enabled: true,
          active: true,
        }),
      { initialProps: { memberIds: ['me', 'alice'] } },
    );

    act(() => {
      result.current.acceptRemoteClaim({
        userId: 'alice',
        seatId: 'B5',
        at: 1,
      });
    });
    rerender({ memberIds: [] });
    expect(result.current.seatMap.B5).toBe('alice');
    expect(result.current.mySeat).not.toBeNull();
  });
});
