import type { RoomMember, WatchPartyRoom } from './types';
import type { RTMMessage } from './types/rtm-messages';

/**
 * Who may chat, draw and play sounds — resolved once, for both the UI and the
 * inbound RTM gate.
 *
 * The three-level precedence (per-member override, then room global, then
 * built-in default) was previously written out inline in `ActiveWatchParty`,
 * `use-watch-party-sidebar` and `WatchPartySettings`, and the copies had already
 * drifted: only one of them treated the host as always-permitted. The backend now
 * resolves the same precedence in `lib/permissions.ts`; this is its client twin,
 * and the two must agree or a member sees an enabled control that silently fails.
 *
 * @packageDocumentation
 */

/** Defaults for a room whose `permissions` block predates a given field. */
const GLOBAL_DEFAULTS = {
  canGuestsChat: true,
  canGuestsDraw: false,
  canGuestsPlaySounds: true,
} as const;

/** Effective capabilities of one member of one room. */
export interface EffectivePermissions {
  /** Whether this user is the room host. Hosts are never restricted. */
  isHost: boolean;
  /** Whether the user appears in `room.members` at all. */
  isMember: boolean;
  canChat: boolean;
  canDraw: boolean;
  canPlaySound: boolean;
}

/**
 * Resolve one capability.
 *
 * Tests `undefined` rather than falsiness on purpose: a per-member override of
 * `false` is exactly the interesting case, and a `||` chain would throw it away
 * and fall through to the room global.
 */
function resolve(
  memberValue: boolean | undefined,
  globalValue: boolean | undefined,
  fallback: boolean,
): boolean {
  if (memberValue !== undefined) return memberValue;
  if (globalValue !== undefined) return globalValue;
  return fallback;
}

/**
 * What `userId` may do in `room`.
 *
 * @param room - Current room, or `null`/`undefined` before it has loaded.
 * @param userId - The member's id. Guests legitimately have none for a moment.
 * @returns Effective capabilities. A non-member, an unknown id, or an absent room
 *   all resolve to no capabilities and `isMember: false`.
 */
export function resolveMemberPermissions(
  room: WatchPartyRoom | null | undefined,
  userId: string | null | undefined,
): EffectivePermissions {
  const denied: EffectivePermissions = {
    isHost: false,
    isMember: false,
    canChat: false,
    canDraw: false,
    canPlaySound: false,
  };

  if (!room || !userId) return denied;

  const isHost = room.hostId === userId;
  const member: RoomMember | undefined = room.members?.find(
    (m) => m?.id === userId,
  );

  if (!member) return { ...denied, isHost };

  // The host owns the room, and `canGuests*` is by its own name about guests.
  if (isHost) {
    return {
      isHost: true,
      isMember: true,
      canChat: true,
      canDraw: true,
      canPlaySound: true,
    };
  }

  const global = room.permissions ?? {};
  const own = member.permissions ?? {};

  return {
    isHost: false,
    isMember: true,
    canChat: resolve(
      own.canChat,
      global.canGuestsChat,
      GLOBAL_DEFAULTS.canGuestsChat,
    ),
    canDraw: resolve(
      own.canDraw,
      global.canGuestsDraw,
      GLOBAL_DEFAULTS.canGuestsDraw,
    ),
    canPlaySound: resolve(
      own.canPlaySound,
      global.canGuestsPlaySounds,
      GLOBAL_DEFAULTS.canGuestsPlaySounds,
    ),
  };
}

/**
 * RTM message types that only a member holding `canDraw` may act on.
 *
 * `SKETCH_REQUEST_SYNC` is deliberately absent: asking for the current canvas is
 * reading, not drawing, and a member with drawing switched off still sees what
 * everyone else has drawn. Everything here mutates the shared canvas —
 * `SKETCH_CLEAR mode:'all'` wipes it for the entire party, and
 * `SKETCH_SYNC_STATE` replaces it wholesale.
 */
const DRAW_GATED = new Set<RTMMessage['type']>([
  'SKETCH_DRAW',
  'SKETCH_UNDO',
  'SKETCH_CLEAR',
  'SKETCH_MOVE_Z',
  'SKETCH_CURSOR_MOVE',
  'SKETCH_REACTION',
  'SKETCH_SYNC_STATE',
]);

/**
 * Whether an inbound RTM message should be acted on, given who sent it.
 *
 * ## Why this exists, and why it is on the receiver
 *
 * Chat, sketch and soundboard are all host-controllable, but only chat has a
 * durable server write, so only chat can be enforced server-side. Sketch strokes
 * and soundboard triggers never reach our backend at all — they are Agora RTM
 * channel messages that go peer to peer, which is the whole reason the sketch
 * overlay feels immediate. Routing them through REST so the server could vet them
 * would mean a round trip per pointer-move event, trading the feature's entire
 * latency design for a property the receiver can enforce itself.
 *
 * For ephemeral data the receiver *is* the right authority, and it is as strong
 * as a server check would be: nothing is persisted, so a message every receiver
 * drops has left no trace. Every client already holds the authoritative
 * permissions — they are written to Redis by the host and arrive over Socket.IO
 * `PERMISSIONS_UPDATED` and RTM — so each receiver can reach the same verdict
 * without asking anyone.
 *
 * Chat is gated here *as well as* on the server, because the two block different
 * things: the server stops a muted guest's line from entering the Redis backlog
 * and being served to everyone who joins later, and this stops the same line
 * appearing live in the chat panel via RTM, which bypasses the server entirely.
 *
 * ## What is not gated
 *
 * Emoji reactions, playback events, membership and theatre traffic. Emoji have no
 * permission to consult. Playback events are already ignored from non-hosts
 * downstream. Membership and 3D presence are not capabilities the host can revoke.
 *
 * @param room - Current room, or null before it has loaded.
 * @param senderId - The RTM publisher id, as reported by the Agora SDK. This is
 *   the authenticated channel identity, not a field in the payload, so it cannot
 *   be forged by editing the message.
 * @param message - The parsed inbound message.
 * @returns `false` only when the message is a gated kind and its sender does not
 *   hold the matching capability. Unknown senders and un-loaded rooms pass, so a
 *   missing publisher id can never blank the party.
 */
export function isRtmMessageAllowed(
  room: WatchPartyRoom | null | undefined,
  senderId: string | undefined,
  message: RTMMessage,
): boolean {
  const type = message.type;
  const isSoundInteraction =
    message.type === 'INTERACTION' && message.kind === 'sound';

  if (!(DRAW_GATED.has(type) || type === 'CHAT' || isSoundInteraction)) {
    return true;
  }

  /*
    No room or no attributable sender means no verdict is possible. Allowing is
    the safe failure: the alternative silently discards legitimate traffic during
    the window before the room lands, which is precisely when a joining guest is
    catching up on the canvas.
  */
  if (!room || !senderId) return true;

  const permissions = resolveMemberPermissions(room, senderId);

  // A sender who is not in the room at all has no business driving any of this.
  if (!permissions.isMember) return false;

  if (isSoundInteraction) return permissions.canPlaySound;
  if (type === 'CHAT') return permissions.canChat;
  return permissions.canDraw;
}
