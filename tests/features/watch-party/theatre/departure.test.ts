import { describe, expect, it } from 'vitest';
import {
  memberNames,
  peersToDrop,
  presentMemberIds,
  type RosterMember,
} from '@/features/watch-party/theatre/lib/roster';
import {
  applyClaim,
  type ClaimMap,
  seatOf,
  toSeatMap,
  vacate,
} from '@/features/watch-party/theatre/lib/seat-claims';

/**
 * Departure, which is messier than it looks.
 *
 * There are three ways someone stops being present, and they do not all produce
 * the same signal:
 *
 *  1. Agora presence LEAVE — a closed tab or a dropped connection. Does NOT remove
 *     them from `room.members`; it sets `disconnected: true`.
 *  2. RTM MEMBER_LEFT — a deliberate exit. Removes them from `members` outright.
 *  3. KICK / PARTY_CLOSED.
 *
 * (1) is by far the most common and is the one that kept leaving bodies behind.
 */

function member(id: string, extra: Partial<RosterMember> = {}): RosterMember {
  return { id, name: id, ...extra };
}

describe('presentMemberIds', () => {
  it('drops a disconnected member, so their chair is not occupied by a ghost', () => {
    const members = [member('alice'), member('bob', { disconnected: true })];
    expect(presentMemberIds(members)).toEqual(['alice']);
  });

  it('drops a disconnected HOST too', () => {
    /*
      The regression this pins. `useWatchPartyMembers.handlePresenceEvent` used to
      bail out entirely for the host, so the host's row was never flagged: their
      avatar stayed sitting in the room, and the Smart TV list kept listing them.
      `useWatchPartySync` owns the host-drop UX but never touches `room.members`.
    */
    const members = [member('host', { disconnected: true }), member('guest')];
    expect(presentMemberIds(members)).toEqual(['guest']);
  });

  it('survives a roster with holes in it', () => {
    // Members arrive asynchronously; nulls and id-less rows are real.
    const members = [null, undefined, { name: 'no id' }, member('alice')];
    expect(presentMemberIds(members)).toEqual(['alice']);
  });

  it('returns empty for a roster that has not loaded', () => {
    expect(presentMemberIds(null)).toEqual([]);
    expect(presentMemberIds(undefined)).toEqual([]);
  });
});

describe('peersToDrop', () => {
  it('drops a peer the roster no longer lists', () => {
    expect(
      peersToDrop({
        knownPeerIds: ['alice', 'bob'],
        presentIds: ['alice'],
        acknowledged: new Set(['alice', 'bob']),
      }),
    ).toEqual(['bob']);
  });

  it('does not drop a peer the roster has never confirmed', () => {
    /*
      A pose can arrive before MEMBER_JOINED propagates. The network hook trusts
      the pose rather than dropping it, so reconciling without the acknowledged set
      would cull that peer on the very next pass and make a joining avatar flicker
      in and straight back out.
    */
    expect(
      peersToDrop({
        knownPeerIds: ['newcomer'],
        presentIds: ['alice'],
        acknowledged: new Set(['alice']),
      }),
    ).toEqual([]);
  });

  it('drops nobody while the roster is empty', () => {
    // An empty roster means it has not loaded, not that the party is deserted —
    // you are always a member of your own party. Without this the first render
    // would wipe every avatar in the room.
    expect(
      peersToDrop({
        knownPeerIds: ['alice', 'bob'],
        presentIds: [],
        acknowledged: new Set(['alice', 'bob']),
      }),
    ).toEqual([]);
  });

  it('is idempotent, so repeated passes are harmless', () => {
    const input = {
      knownPeerIds: ['alice'],
      presentIds: ['alice'],
      acknowledged: new Set(['alice']),
    };
    expect(peersToDrop(input)).toEqual([]);
    expect(peersToDrop(input)).toEqual([]);
  });
});

describe('seat release on disconnect', () => {
  /**
   * A stale claim is worse than a stale avatar.
   *
   * The deterministic rule compares timestamps, so a claim made minutes ago beats
   * every fresh claim on that chair. A member who dropped without emitting
   * MEMBER_LEFT left their seat looking empty and refusing to be taken.
   */
  it('makes a ghost claim beat every later claim — which is why it must be cleared', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'ghost', 1_000);

    // Somebody still in the room tries to sit there later.
    expect(applyClaim(claims, 'A1', 'alice', 9_000)).toBe(false);
    expect(seatOf(claims, 'alice')).toBeNull();
  });

  it('frees the chair once the ghost is reconciled away', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'ghost', 1_000);

    // What the reconcile effect does: anyone absent from the roster is vacated.
    const present = new Set(['alice']);
    for (const [, claim] of claims) {
      if (!present.has(claim.userId)) vacate(claims, claim.userId);
    }

    expect(toSeatMap(claims).A1).toBeNull();
    expect(applyClaim(claims, 'A1', 'alice', 9_000)).toBe(true);
  });

  it('keeps the seats of everyone still present', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 1_000);
    applyClaim(claims, 'A2', 'bob', 1_100);
    applyClaim(claims, 'B1', 'ghost', 1_200);

    const present = new Set(['alice', 'bob']);
    for (const [, claim] of claims) {
      if (!present.has(claim.userId)) vacate(claims, claim.userId);
    }

    const map = toSeatMap(claims);
    expect(map.A1).toBe('alice');
    expect(map.A2).toBe('bob');
    expect(map.B1).toBeNull();
  });

  it('releases a seat held by a disconnected member end to end', () => {
    // The full path: roster marks them disconnected, presentMemberIds drops them,
    // reconciliation frees the chair.
    const roster = [member('alice'), member('bob', { disconnected: true })];
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 1_000);
    applyClaim(claims, 'A2', 'bob', 1_100);

    const present = new Set(presentMemberIds(roster));
    for (const [, claim] of claims) {
      if (!present.has(claim.userId)) vacate(claims, claim.userId);
    }

    expect(toSeatMap(claims)).toMatchObject({ A1: 'alice', A2: null });
  });
});

describe('memberNames', () => {
  it('keeps the name of a disconnected member', () => {
    // Presence and naming are separate questions: dropping the name of someone in
    // their grace period would make a reconnect flash a raw id.
    const names = memberNames([member('bob', { disconnected: true })]);
    expect(names.bob).toBe('bob');
  });

  it('ignores blank and missing names rather than storing empty strings', () => {
    const names = memberNames([
      { id: 'a', name: '   ' },
      { id: 'b' },
      { id: 'c', name: 'Carol' },
    ]);
    expect(names).toEqual({ c: 'Carol' });
  });
});
