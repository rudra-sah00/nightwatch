/**
 * Phase 0.5 proof for AUDIT.md WP-C1 — the inbound RTM gate does not cover host authority.
 *
 * `isRtmMessageAllowed` is the only place an inbound RTM message is checked against its sender
 * (`useWatchParty.ts:151`). It gates three kinds: the draw-gated set, `CHAT`, and a sound
 * `INTERACTION`. Everything else returns `true` regardless of who sent it, and since RTM is peer
 * to peer and every member holds full publish rights on the channel
 * (`agoraToken.ts` mints a login privilege with no publisher role and no channel scope), any
 * admitted member can publish the messages that assert host authority and have every other
 * client act on them.
 *
 * These tests assert the property the gate should have, so they FAIL against the current
 * implementation — that is the point. Each `expect(...).toBe(false)` below currently returns
 * `true`.
 *
 * Kept as a pure-function test deliberately. The end-to-end exploit needs a second participant
 * and live Agora and is not reproducible locally, but the gate's coverage is a pure function of
 * (room, senderId, message) and is fully decidable here.
 */
import { describe, expect, it } from 'vitest';
import { isRtmMessageAllowed } from '@/features/watch-party/room/permissions';
import type {
  RoomMember,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

function member(id: string, overrides: Partial<RoomMember> = {}): RoomMember {
  return { id, name: id, isHost: false, joinedAt: 0, ...overrides };
}

/** H1 hosts; G1 is an ordinary approved guest. */
function room(overrides: Partial<WatchPartyRoom> = {}): WatchPartyRoom {
  return {
    id: 'R1',
    hostId: 'H1',
    title: 'T',
    type: 'movie',
    contentId: 'c1',
    streamUrl: 'https://cdn/x.m3u8',
    members: [member('H1', { isHost: true }), member('G1')],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      lastUpdated: 0,
      playbackRate: 1,
    },
    permissions: {
      canGuestsDraw: false,
      canGuestsPlaySounds: true,
      canGuestsChat: true,
    },
    createdAt: 0,
    ...overrides,
  } as WatchPartyRoom;
}

/**
 * Every message type that asserts an authority only the host holds.
 *
 * Grouped by what a guest gains by publishing it, and each is quoted against the handler that
 * acts on it so the consequence is traceable from the test.
 */
const HOST_AUTHORITY_MESSAGES: Array<{ what: string; msg: RTMMessage }> = [
  // useWatchPartyMembers.ts:507 — merges straight into room.permissions on every client.
  // This is the one that matters most: it re-opens the draw/chat/sound gate this very
  // function implements, so while it is ungated the gate is bypassable.
  {
    what: 'PERMISSIONS_UPDATED (grants itself every capability)',
    msg: {
      type: 'PERMISSIONS_UPDATED',
      permissions: {
        canGuestsDraw: true,
        canGuestsChat: true,
        canGuestsPlaySounds: true,
      },
    },
  },
  // useWatchPartyMembers.ts:521 — same, per member, so it can also mute someone else.
  {
    what: 'MEMBER_PERMISSIONS_UPDATED (mutes another member)',
    msg: {
      type: 'MEMBER_PERMISSIONS_UPDATED',
      memberId: 'H1',
      permissions: { canChat: false },
    },
  },
  // useWatchParty.ts:235 — calls closeParty() unconditionally. Session over for everyone.
  {
    what: 'PARTY_CLOSED (ends the session for everyone)',
    msg: { type: 'PARTY_CLOSED', reason: 'bye' },
  },
  // useWatchParty.ts:222 — the target leaves and its guest_token is cleared. Works on the host.
  {
    what: 'KICK (evicts the host)',
    msg: { type: 'KICK', targetUserId: 'H1', reason: 'bye' },
  },
  // useWatchPartySync.ts:298 — repoints every member's player at this payload.
  {
    what: 'CONTENT_UPDATED (repoints every player)',
    msg: {
      type: 'CONTENT_UPDATED',
      room: room({ streamUrl: 'https://attacker.example/x.m3u8' }),
    },
  },
  // useWatchPartySync.ts:223-227 — applied with no sender check; also feeds clock calibration
  // through useWatchParty.ts:160.
  {
    what: 'SEEK_EVENT (seizes playback)',
    msg: {
      type: 'SEEK_EVENT',
      videoTime: 9999,
      playbackRate: 1,
      wasPlaying: true,
      serverTime: 1000,
    },
  },
  {
    what: 'PAUSE_EVENT (seizes playback)',
    msg: { type: 'PAUSE_EVENT', videoTime: 5, serverTime: 1000 },
  },
  {
    what: 'SYNC (seizes playback wholesale)',
    msg: {
      type: 'SYNC',
      currentTime: 9999,
      videoTime: 9999,
      isPlaying: false,
      playbackRate: 3,
      serverTime: 1000,
      // Payload field, so it is forgeable — and nothing reads it anyway.
      fromHost: true,
    },
  },
  // useWatchPartySync.ts:333 — rewrites every member's stream URLs via normalizeRoomUrls.
  {
    what: 'STREAM_TOKEN (rewrites stream URLs)',
    msg: { type: 'STREAM_TOKEN', token: 'attacker-token' },
  },
];

describe('isRtmMessageAllowed — host authority (AUDIT.md WP-C1)', () => {
  it.each(HOST_AUTHORITY_MESSAGES)(
    'rejects $what from an ordinary guest',
    ({ msg }) => {
      expect(isRtmMessageAllowed(room(), 'G1', msg)).toBe(false);
    },
  );

  /*
    The mirror of the above, and the reason the fix cannot simply be "drop these message types".
    The host must keep every one of these powers, so a fix that hardens the guest path by
    breaking the host path is not a fix.
  */
  it.each(HOST_AUTHORITY_MESSAGES)(
    'still allows $what from the host',
    ({ msg }) => {
      expect(isRtmMessageAllowed(room(), 'H1', msg)).toBe(true);
    },
  );

  /*
    A sender absent from room.members is not merely unprivileged, it is unaccountable — this is
    the kicked-member-still-publishing case.
  */
  it.each(HOST_AUTHORITY_MESSAGES)(
    'rejects $what from a sender who is not in the room',
    ({ msg }) => {
      expect(isRtmMessageAllowed(room(), 'UNKNOWN', msg)).toBe(false);
    },
  );

  /*
    No room means no verdict is possible, and for host authority the safe answer is to refuse.

    I first wrote this assertion the other way, preserving the fail-open rule the module already
    had. That was wrong. The fail-open rule is argued specifically from the sketch case — dropping
    canvas history during the join window would lose something a guest legitimately needs — and
    none of that applies to a host-authority message, which is meaningless to a client with no
    room. There is no playhead to seek and no party to close, so refusing costs nothing and closes
    the window instead of leaving it open.
  */
  it('refuses a host-authority message when the room has not loaded yet', () => {
    expect(
      isRtmMessageAllowed(null, 'G1', { type: 'PARTY_CLOSED', reason: 'x' }),
    ).toBe(false);
  });

  /*
    And the other half of that: the fail-open rule must survive for the traffic it was written for.
    A guest catching up on the canvas before the room lands still gets its sketch history.
  */
  it('still allows sketch traffic when the room has not loaded yet', () => {
    expect(
      isRtmMessageAllowed(null, 'G1', {
        type: 'SKETCH_SYNC_STATE',
        elements: [],
        targetId: 'G1',
      }),
    ).toBe(true);
  });

  /*
    The join handshake is deliberately out of scope for this pass and must keep working. A guest
    receives JOIN_APPROVED while its own `room` is still null, so there is no hostId to compare
    against — gating it the same way would break joining outright.
  */
  it('leaves the join handshake alone, which arrives before any room exists', () => {
    expect(
      isRtmMessageAllowed(null, 'H1', {
        type: 'JOIN_REJECTED',
        reason: 'full',
      }),
    ).toBe(true);
  });
});
