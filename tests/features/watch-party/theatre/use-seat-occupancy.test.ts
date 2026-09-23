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

type ClaimListener = (c: {
  userId: string;
  seatId: string | null;
  at: number;
}) => void;

const claimListeners = new Set<ClaimListener>();
const joinListeners = new Set<(m: { id: string }) => void>();
const leftListeners = new Set<(id: string) => void>();

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  onSeatClaim: (cb: ClaimListener) => {
    claimListeners.add(cb);
    return () => claimListeners.delete(cb);
  },
  onMemberJoined: (cb: (m: { id: string }) => void) => {
    joinListeners.add(cb);
    return () => joinListeners.delete(cb);
  },
  onMemberLeft: (cb: (id: string) => void) => {
    leftListeners.add(cb);
    return () => leftListeners.delete(cb);
  },
}));

/** A claim arriving from somebody else. */
function incomingClaim(userId: string, seatId: string | null, at: number) {
  act(() => {
    for (const cb of claimListeners) cb({ userId, seatId, at });
  });
}

function memberLeft(userId: string) {
  act(() => {
    for (const cb of leftListeners) cb(userId);
  });
}

function setup(
  overrides: Partial<Parameters<typeof useSeatOccupancy>[0]> = {},
) {
  const rtmSendMessage = vi.fn();
  const view = renderHook(
    (props: { active: boolean }) =>
      useSeatOccupancy({
        userId: 'me',
        rtmSendMessage,
        memberIds: ['me', 'alice'],
        enabled: true,
        active: props.active,
        ...overrides,
      }),
    { initialProps: { active: true } },
  );
  return { ...view, rtmSendMessage };
}

const claimsSent = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls
    .map((c) => c[0])
    .filter((m) => m.type === 'SEAT_CLAIM')
    .map((m) => m.seatId);

describe('useSeatOccupancy — entering 3D', () => {
  beforeEach(() => {
    claimListeners.clear();
    joinListeners.clear();
    leftListeners.clear();
  });

  it('seats you the first time you enter, and tells the room', () => {
    // The spawn point is on the rear platform behind both rows, so an unseated
    // arrival's first frame is the backs of other people's heads.
    const { result, rtmSendMessage } = setup();
    expect(result.current.mySeat).toBe(autoSeatOrder('me')[0]);
    expect(claimsSent(rtmSendMessage)).toEqual([result.current.mySeat]);
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
    const { result, rtmSendMessage } = setup();
    const first = result.current.mySeat as SeatId;

    // Somebody else got there a second earlier, which beats us on timestamp.
    incomingClaim('alice', first, 1);

    expect(result.current.seatMap[first]).toBe('alice');
    expect(result.current.mySeat).not.toBeNull();
    expect(result.current.mySeat).not.toBe(first);
    expect(claimsSent(rtmSendMessage)).toEqual([first, result.current.mySeat]);
  });
});

describe('useSeatOccupancy — 2D <-> 3D round trip', () => {
  beforeEach(() => {
    claimListeners.clear();
    joinListeners.clear();
    leftListeners.clear();
  });

  it('keeps your seat through 3D -> 2D -> 3D, without re-claiming it', () => {
    const { result, rerender, rtmSendMessage } = setup();
    const seat = result.current.mySeat;
    expect(seat).not.toBeNull();

    rerender({ active: false }); // V, back to the flat player
    expect(result.current.mySeat).toBe(seat);

    rerender({ active: true }); // V, back into the room
    expect(result.current.mySeat).toBe(seat);

    // One claim in total. A second would carry a fresh timestamp and lose the
    // seat to anybody who has claimed more recently.
    expect(claimsSent(rtmSendMessage)).toEqual([seat]);
  });

  it('survives repeated switching', () => {
    const { result, rerender, rtmSendMessage } = setup();
    const seat = result.current.mySeat;

    for (let i = 0; i < 5; i += 1) {
      rerender({ active: false });
      rerender({ active: true });
    }

    expect(result.current.mySeat).toBe(seat);
    expect(claimsSent(rtmSendMessage)).toEqual([seat]);
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
  beforeEach(() => {
    claimListeners.clear();
    joinListeners.clear();
    leftListeners.clear();
  });

  it('frees a chair the moment its occupant leaves the party', () => {
    /*
      The bug this closes. A claim that outlives its owner does not merely look
      wrong — the deterministic rule favours the EARLIEST timestamp, so a ghost
      claim beats every later one and that chair is reserved for somebody who has
      gone, for the rest of the party.
    */
    const { result } = setup();
    incomingClaim('alice', 'B5', 1);
    expect(result.current.seatMap.B5).toBe('alice');

    memberLeft('alice');
    expect(result.current.seatMap.B5).toBeNull();
  });

  it('releases a seat held by someone the roster has dropped', () => {
    // The commonest departure is a closed tab, which only ever surfaces as an
    // Agora presence LEAVE — no MEMBER_LEFT is emitted, so reconciling against the
    // roster is what actually clears the chair.
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

    incomingClaim('alice', 'B5', 1);
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

    incomingClaim('alice', 'B5', 1);
    rerender({ memberIds: [] });
    expect(result.current.seatMap.B5).toBe('alice');
    expect(result.current.mySeat).not.toBeNull();
  });
});
