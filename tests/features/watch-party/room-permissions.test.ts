import { describe, expect, it } from 'vitest';
import {
  isRtmMessageAllowed,
  resolveMemberPermissions,
} from '@/features/watch-party/room/permissions';
import type {
  RoomMember,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

function member(id: string, overrides: Partial<RoomMember> = {}): RoomMember {
  return { id, name: id, isHost: false, joinedAt: 0, ...overrides };
}

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

/** Give G1 a per-member override on top of the defaults. */
function withGuestPermissions(
  permissions: NonNullable<RoomMember['permissions']>,
  globals?: Partial<WatchPartyRoom['permissions']>,
): WatchPartyRoom {
  const base = room();
  return room({
    members: [member('H1', { isHost: true }), member('G1', { permissions })],
    permissions: { ...base.permissions, ...globals },
  });
}

describe('resolveMemberPermissions', () => {
  it('never restricts the host, even when guest drawing is off', () => {
    expect(resolveMemberPermissions(room(), 'H1')).toEqual({
      isHost: true,
      isMember: true,
      canChat: true,
      canDraw: true,
      canPlaySound: true,
    });
  });

  it('applies the room globals to a guest', () => {
    const perms = resolveMemberPermissions(room(), 'G1');
    expect(perms).toMatchObject({
      isHost: false,
      isMember: true,
      canChat: true,
      canDraw: false,
      canPlaySound: true,
    });
  });

  /*
    The case a `||` chain silently discards. `false ?? true` is `false`, but
    `false || true` is `true` — a member the host had explicitly muted would have
    fallen through to the permissive room global.
  */
  it('honours a per-member `false` against a permissive global', () => {
    const r = withGuestPermissions({ canChat: false }, { canGuestsChat: true });
    expect(resolveMemberPermissions(r, 'G1').canChat).toBe(false);
  });

  it('honours a per-member `true` against a restrictive global', () => {
    const r = withGuestPermissions({ canDraw: true }, { canGuestsDraw: false });
    expect(resolveMemberPermissions(r, 'G1').canDraw).toBe(true);
  });

  it('refuses everything to a non-member, an absent room, and a missing id', () => {
    for (const perms of [
      resolveMemberPermissions(room(), 'stranger'),
      resolveMemberPermissions(null, 'G1'),
      resolveMemberPermissions(room(), undefined),
    ]) {
      expect(perms.isMember).toBe(false);
      expect(perms.canChat).toBe(false);
      expect(perms.canDraw).toBe(false);
      expect(perms.canPlaySound).toBe(false);
    }
  });

  it('falls back to the built-in defaults when the permissions block has holes', () => {
    const r = room({ permissions: {} as never });
    expect(resolveMemberPermissions(r, 'G1')).toMatchObject({
      canChat: true,
      canPlaySound: true,
      canDraw: false,
    });
  });
});

/**
 * Receiver-side enforcement of the permissions that never reach our backend.
 *
 * Sketch and soundboard traffic is Agora RTM channel data, peer to peer, so the
 * server never sees it and cannot vet it. Before this gate existed the only thing
 * enforcing `canGuestsDraw` and `canGuestsPlaySounds` was whether the sender's own
 * UI offered the button: a guest with drawing switched off could publish
 * `SKETCH_CLEAR mode:'all'` by hand and wipe the host's canvas for the entire
 * party, and a guest barred from the soundboard could publish an `INTERACTION`
 * that every client played.
 *
 * Chat is gated here as well as on the server, because the two block different
 * things — the server keeps a muted guest out of the durable Redis backlog that
 * late joiners read, and this keeps the same line out of the live chat panel,
 * which RTM delivers without the server ever being involved.
 */
describe('isRtmMessageAllowed', () => {
  const draw: RTMMessage = {
    type: 'SKETCH_DRAW',
    action: { id: 'a1' } as never,
  };
  const clearAll: RTMMessage = {
    type: 'SKETCH_CLEAR',
    mode: 'all',
    userId: 'G1',
  };
  const sound: RTMMessage = {
    type: 'INTERACTION',
    kind: 'sound',
    sound: 'https://s/1.mp3',
    userId: 'G1',
  };
  const emoji: RTMMessage = {
    type: 'INTERACTION',
    kind: 'emoji',
    emoji: '🎉',
    userId: 'G1',
  };
  const chat: RTMMessage = {
    type: 'CHAT',
    messageId: 'm1',
    userId: 'G1',
    userName: 'G1',
    content: 'hi',
    isSystem: false,
    timestamp: 0,
  };

  it('drops sketch traffic from a guest who may not draw', () => {
    const r = room(); // canGuestsDraw: false
    expect(isRtmMessageAllowed(r, 'G1', draw)).toBe(false);
    expect(isRtmMessageAllowed(r, 'G1', clearAll)).toBe(false);
  });

  it('accepts sketch traffic once the host grants drawing', () => {
    const r = room({
      permissions: {
        canGuestsDraw: true,
        canGuestsPlaySounds: true,
        canGuestsChat: true,
      },
    });
    expect(isRtmMessageAllowed(r, 'G1', draw)).toBe(true);
    expect(isRtmMessageAllowed(r, 'G1', clearAll)).toBe(true);
  });

  it('always accepts sketch traffic from the host', () => {
    expect(isRtmMessageAllowed(room(), 'H1', draw)).toBe(true);
  });

  it('drops a sound from a guest barred from the soundboard', () => {
    const r = withGuestPermissions({ canPlaySound: false });
    expect(isRtmMessageAllowed(r, 'G1', sound)).toBe(false);
  });

  it('leaves emoji reactions alone — there is no permission for them', () => {
    const r = withGuestPermissions({ canPlaySound: false, canDraw: false });
    expect(isRtmMessageAllowed(r, 'G1', emoji)).toBe(true);
  });

  it("drops a muted guest's live chat line, not just its persisted copy", () => {
    const r = withGuestPermissions({ canChat: false });
    expect(isRtmMessageAllowed(r, 'G1', chat)).toBe(false);
  });

  it('drops gated traffic from someone who is not in the room at all', () => {
    expect(isRtmMessageAllowed(room(), 'stranger', chat)).toBe(false);
    expect(isRtmMessageAllowed(room(), 'stranger', sound)).toBe(false);
  });

  /*
    Failing open is deliberate. The window before the room lands is exactly when a
    joining guest is catching up on the canvas, and a gate that dropped traffic
    then would blank the party for the very case it is meant to protect.
  */
  it('passes everything when no verdict is possible', () => {
    expect(isRtmMessageAllowed(null, 'G1', draw)).toBe(true);
    expect(isRtmMessageAllowed(room(), undefined, draw)).toBe(true);
  });

  it('never gates playback, membership or theatre traffic', () => {
    const ungated: RTMMessage[] = [
      { type: 'PLAY_EVENT', videoTime: 1, playbackRate: 1, serverTime: 0 },
      { type: 'PAUSE_EVENT', videoTime: 1, serverTime: 0 },
      { type: 'MEMBER_LEFT', userId: 'G1' },
      { type: 'SEAT_CLAIM', userId: 'G1', seatId: 's1', at: 0 },
      { type: 'SKETCH_REQUEST_SYNC', requesterId: 'G1' },
    ];
    // G1 holds no drawing permission in the default room.
    for (const msg of ungated) {
      expect(isRtmMessageAllowed(room(), 'G1', msg)).toBe(true);
    }
  });
});
