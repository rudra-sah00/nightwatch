import type { RTMMessage } from '../types/rtm-messages';

/**
 * RTM event bus.
 *
 * Bridges incoming Agora RTM messages to a local emitter, so UI components
 * subscribe with `onSketchDraw(cb)` instead of each one having to be threaded a
 * message handler down from `useWatchParty`. The `on*` wrappers also narrow each
 * message's untyped payload once, here, rather than at every consumer.
 *
 * One dispatcher per browser tab, fed by `useWatchParty`'s `onMessage`. That is
 * why `WatchPartyClient` enforces single-tab ownership over `BroadcastChannel`:
 * two RTM connections in one browser would deliver every event twice.
 *
 * Extracted from `watch-party.api.ts`, where it sat under 420 lines of unrelated
 * REST helpers — a pub/sub singleton and a set of stateless fetch wrappers have
 * nothing in common but the word "service".
 *
 * @packageDocumentation
 */

// =========================================================================

type RtmListener = (data: Record<string, unknown>) => void;
const rtmListeners: Record<string, Set<RtmListener>> = {};

/**
 * Internal: Dispatch an incoming RTM message to all local subscribers
 */
export function dispatchRtmMessage(msg: RTMMessage) {
  const msgRecord = msg as unknown as Record<string, unknown>;
  const eventType = msgRecord.type as string;
  if (rtmListeners[eventType]) {
    rtmListeners[eventType].forEach((cb) => {
      cb(msgRecord);
    });
  }
  // Also dispatch to the generic "INTERACTION" listener if it's an interaction
  if (eventType === 'INTERACTION' && rtmListeners.INTERACTION) {
    rtmListeners.INTERACTION.forEach((cb) => {
      cb(msgRecord);
    });
  }
}

function subscribe(event: string, callback: RtmListener) {
  if (!rtmListeners[event]) rtmListeners[event] = new Set();
  rtmListeners[event].add(callback);
  return () => {
    rtmListeners[event].delete(callback);
  };
}

export const onSketchDraw = <T = unknown>(callback: (action: T) => void) =>
  subscribe('SKETCH_DRAW', (msg) => callback(msg.action as unknown as T));

/* ───────────────────── 3D theatre mode ───────────────────── */

/**
 * Remote avatar poses. Fires for peers only — `useAgoraRtm` does not echo the
 * local user's own messages back, so no self-filtering is needed here.
 */
export const onAvatarTransform = (
  callback: (pose: {
    userId: string;
    x: number;
    y: number;
    z: number;
    r: number;
    s: string;
    c?: 'm' | 'w';
    d?: number;
    t: number;
  }) => void,
) =>
  subscribe('AVATAR_TRANSFORM', (msg) =>
    callback({
      userId: msg.userId as string,
      x: msg.x as number,
      y: msg.y as number,
      z: msg.z as number,
      r: msg.r as number,
      s: msg.s as string,
      // Older clients omit this; the avatar layer falls back to a hash of the id.
      c: msg.c === 'm' || msg.c === 'w' ? msg.c : undefined,
      d: typeof msg.d === 'number' ? msg.d : undefined,
      t: msg.t as number,
    }),
  );

/**
 * Latency probes. See `RtmAvatarPing` for why a round trip is required rather
 * than reading the timestamp off a pose message.
 */
export const onAvatarPing = (
  callback: (msg: { userId: string; id: string }) => void,
) =>
  subscribe('AVATAR_PING', (msg) =>
    callback({ userId: msg.userId as string, id: msg.id as string }),
  );

export const onAvatarPong = (
  callback: (msg: { userId: string; to: string; id: string }) => void,
) =>
  subscribe('AVATAR_PONG', (msg) =>
    callback({
      userId: msg.userId as string,
      to: msg.to as string,
      id: msg.id as string,
    }),
  );

/**
 * Chat lines, for 3D speech bubbles. Same stream the 2D sidebar consumes — there
 * is one conversation, so a line said in 3D must show in the sidebar too.
 */
export const onChatMessage = (
  callback: (m: { userId: string; userName: string; text: string }) => void,
) =>
  subscribe('CHAT', (msg) => {
    // system notices have no speaker, so they get no bubble
    if (msg.isSystem) return;
    const text = (msg.content as string) ?? '';
    const userId = msg.userId as string;
    if (!userId || !text) return;
    callback({ userId, userName: (msg.userName as string) ?? '', text });
  });

/** Broadcast seat claims. Applied by every client under the same rule. */
export const onSeatClaim = (
  callback: (c: { userId: string; seatId: string | null; at: number }) => void,
) =>
  subscribe('SEAT_CLAIM', (msg) =>
    callback({
      userId: msg.userId as string,
      seatId: (msg.seatId ?? null) as string | null,
      at: (msg.at as number) ?? Date.now(),
    }),
  );

/** Host-authoritative seat occupancy map. */
export const onSeatMap = (
  callback: (seats: Record<string, string | null>) => void,
) =>
  subscribe('SEAT_MAP', (msg) =>
    callback(msg.seats as Record<string, string | null>),
  );

/**
 * Party roster changes, used to spawn and despawn 3D avatars.
 *
 * Membership is the authority on who exists in the room — not avatar traffic.
 * Inferring presence from movement means a motionless avatar is invisible and a
 * departed one lingers until a timeout.
 */
export const onMemberJoined = (
  callback: (member: { id: string; name?: string }) => void,
) =>
  subscribe('MEMBER_JOINED', (msg) => {
    const m = msg.member as Record<string, unknown> | undefined;
    if (!m) return;
    const id = (m.userId ?? m.id) as string | undefined;
    if (!id) return;
    callback({ id, name: (m.userName ?? m.name) as string | undefined });
  });

/**
 * A member leaving.
 *
 * Reads the id defensively. `onMemberJoined` above already tolerates both
 * `member.userId` and `member.id`, which tells us the wire shape is not
 * consistent — and this handler drives avatar despawn in the 3D theatre, where a
 * silently dropped id leaves a body sitting in a chair. Accepting the same
 * variants here costs nothing and removes a whole class of ghost.
 */
export const onMemberLeft = (callback: (userId: string) => void) =>
  subscribe('MEMBER_LEFT', (msg) => {
    const m = msg.member as Record<string, unknown> | undefined;
    const id = (msg.userId ?? msg.id ?? m?.userId ?? m?.id) as
      | string
      | undefined;
    if (typeof id !== 'string' || id.length === 0) return;
    callback(id);
  });

export const onSketchClear = <
  T extends { userId: string; type: 'all' | 'self' } = {
    userId: string;
    type: 'all' | 'self';
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_CLEAR', (msg) =>
    callback({
      userId: msg.userId as string,
      type: msg.mode as 'all' | 'self',
    } as unknown as T),
  );

export const onSketchUndo = <
  T extends { userId: string; actionId: string } = {
    userId: string;
    actionId: string;
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_UNDO', (msg) =>
    callback({
      userId: msg.userId as string,
      actionId: msg.actionId as string,
    } as unknown as T),
  );

export const onSketchProvideSync = <
  T extends { requesterId: string } = { requesterId: string },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_REQUEST_SYNC', (msg) =>
    callback({ requesterId: msg.requesterId as string } as unknown as T),
  );

export const onSketchSyncState = <T = unknown[]>(
  callback: (data: { elements: T }) => void,
) =>
  subscribe('SKETCH_SYNC_STATE', (msg) =>
    callback({ elements: msg.elements as T }),
  );

export const onSketchMoveZ = <
  T extends { actionId: string; direction: 'front' | 'back' } = {
    actionId: string;
    direction: 'front' | 'back';
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_MOVE_Z', (msg) =>
    callback({
      actionId: msg.actionId as string,
      direction: msg.direction as 'front' | 'back',
    } as unknown as T),
  );

export const onSketchCursorMove = <
  T extends {
    x: number;
    y: number;
    userName: string;
    color: string;
    userId: string;
  } = {
    x: number;
    y: number;
    userName: string;
    color: string;
    userId: string;
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_CURSOR_MOVE', (msg) =>
    callback({
      x: msg.x as number,
      y: msg.y as number,
      userName: msg.userName as string,
      color: msg.color as string,
      userId: msg.userId as string,
    } as unknown as T),
  );

export const onSketchReaction = <
  T extends {
    kind: 'heart' | 'star' | 'fire' | 'sparkle';
    x: number;
    y: number;
    color: string;
    userId: string;
  } = {
    kind: 'heart' | 'star' | 'fire' | 'sparkle';
    x: number;
    y: number;
    color: string;
    userId: string;
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_REACTION', (msg) =>
    callback({
      kind: msg.kind as 'heart' | 'star' | 'fire' | 'sparkle',
      x: msg.x as number,
      y: msg.y as number,
      color: msg.color as string,
      userId: msg.userId as string,
    } as unknown as T),
  );

export const onPartyInteraction = <T = unknown>(
  callback: (interaction: T) => void,
) => subscribe('INTERACTION', (msg) => callback(msg as unknown as T));
