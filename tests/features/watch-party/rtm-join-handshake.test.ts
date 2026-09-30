/**
 * Regression tests for the last open row of AUDIT.md WP-C1 — the join handshake was ungated.
 *
 * `JOIN_APPROVED` and `JOIN_REJECTED` were left out of the host-authority fix because they are the one
 * pair that legitimately arrives while the recipient's `room` is still `null` — that is the handshake
 * itself — so there is no `room.hostId` to compare the sender against. `JOIN_APPROVED` carries a whole
 * room object the recipient adopts wholesale, so a forged one redirects a joining user at an
 * attacker-supplied `streamUrl`.
 *
 * They are now gated on `expectedHostId`, the host id the lobby preview already carries.
 *
 * **This closes the hole for authenticated joiners only.** The backend deliberately withholds `hostId`
 * from unauthenticated room previews (`checkRoom` includes it only when `req.user?.id` is set), so a guest
 * has no expected host to check against and the handshake stays open for them. The gate fails open in
 * that case because the alternative is refusing the handshake and making joining impossible for exactly
 * the users the flow exists for. The asymmetry is in the available data, not in the rule; closing it for
 * guests means deciding to expose `hostId` to unauthenticated previews, which is a backend privacy call.
 */
import { describe, expect, it } from 'vitest';
import { isRtmMessageAllowed } from '@/features/watch-party/room/permissions';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

const HOST = 'host-1';
const ATTACKER = 'guest-2';

function forgedRoom(): WatchPartyRoom {
  return {
    id: 'R1',
    hostId: ATTACKER,
    title: 'Not the real party',
    type: 'movie',
    contentId: 'c1',
    streamUrl: 'https://attacker.example/x.m3u8',
    members: [],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      lastUpdated: 0,
      playbackRate: 1,
    },
    permissions: {},
    createdAt: 0,
  } as unknown as WatchPartyRoom;
}

const approved = (): RTMMessage =>
  ({
    type: 'JOIN_APPROVED',
    room: forgedRoom(),
    streamToken: 'attacker-token',
  }) as RTMMessage;

const rejected = (): RTMMessage =>
  ({ type: 'JOIN_REJECTED', reason: 'nope' }) as RTMMessage;

describe('join handshake — gated on the expected host (WP-C1 final row)', () => {
  /*
    The room is null throughout: that is the state a pending joiner is in, and the reason this pair could
    not be covered by the room.hostId check the rest of the host-authority set uses.
  */
  it('refuses a forged JOIN_APPROVED from another member', () => {
    expect(isRtmMessageAllowed(null, ATTACKER, approved(), HOST)).toBe(false);
  });

  it('refuses a forged JOIN_REJECTED from another member', () => {
    expect(isRtmMessageAllowed(null, ATTACKER, rejected(), HOST)).toBe(false);
  });

  it('accepts the handshake from the real host', () => {
    expect(isRtmMessageAllowed(null, HOST, approved(), HOST)).toBe(true);
    expect(isRtmMessageAllowed(null, HOST, rejected(), HOST)).toBe(true);
  });

  /*
    The documented limit. A guest has no expected host, so the handshake must still pass — refusing it
    would make joining impossible for unauthenticated users. This asserts the failure mode deliberately so
    it is not mistaken for coverage.
  */
  it('still passes the handshake when the expected host is unknown', () => {
    expect(isRtmMessageAllowed(null, ATTACKER, approved(), undefined)).toBe(
      true,
    );
  });

  it('still passes when there is no attributable sender', () => {
    expect(isRtmMessageAllowed(null, undefined, approved(), HOST)).toBe(true);
  });

  /*
    The handshake check must not disturb the rest of the gate. A sound interaction is capability-gated and
    has nothing to do with expectedHostId.
  */
  it('does not change how other message kinds are judged', () => {
    const sound = {
      type: 'INTERACTION',
      kind: 'sound',
      sound: 'airhorn',
      userId: ATTACKER,
    } as RTMMessage;
    // No room means no verdict on a capability, so it passes as it always did.
    expect(isRtmMessageAllowed(null, ATTACKER, sound, HOST)).toBe(true);
  });

  /* And the host-authority set still fails closed without a room, unaffected by the new parameter. */
  it('still refuses a host-authority message with no room', () => {
    expect(
      isRtmMessageAllowed(
        null,
        HOST,
        { type: 'PARTY_CLOSED', reason: 'x' } as RTMMessage,
        HOST,
      ),
    ).toBe(false);
  });
});
