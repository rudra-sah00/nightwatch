/**
 * Turning Agora RTM presence events into membership changes.
 *
 * Four of the SDK's event types carry membership, and only two of them were ever
 * handled:
 *
 *  - `REMOTE_JOIN`, `REMOTE_LEAVE`, `REMOTE_TIMEOUT` are per-user. A dropped
 *    socket arrives as `REMOTE_TIMEOUT`, not `REMOTE_LEAVE`, and that is the
 *    commonest way anybody leaves a party.
 *  - `SNAPSHOT` arrives once, on subscribe, listing everyone already in the
 *    channel. Without it a client learns about existing members only when they
 *    next speak or move — a silent member did not exist at all until their next
 *    heartbeat, and in the 3D theatre their chair stood empty.
 *  - `INTERVAL` is what Agora switches to under load: it batches joins, leaves and
 *    timeouts into lists and stops sending the per-user events. A client that
 *    ignores it sees no departures whatsoever.
 *
 * Pure and exported so the mapping can be tested without an Agora client, the
 * same way `mapLinkStateToConnectionState` is. `useAgoraRtm` does nothing with the
 * result but hand each entry to its `onPresence` callback.
 *
 * @packageDocumentation
 */

/** What the party roster does with a presence change. */
export type PresenceAction = 'JOIN' | 'LEAVE';

/** One membership change, in the shape `useWatchParty` consumes. */
export interface PresenceMemberEvent {
  action: PresenceAction;
  userId: string;
}

/**
 * The fields of the SDK's `PresenceEvent` that matter here.
 *
 * Declared structurally rather than imported so this module does not pull the RTM
 * SDK into anything that only wants the mapping — including its tests.
 */
export interface RtmPresenceEvent {
  eventType: string;
  channelName?: string;
  publisher?: string;
  /** Valid when `eventType` is `SNAPSHOT`; null on every other event. */
  snapshot?: { userId?: string }[] | null;
  /** Valid when `eventType` is `INTERVAL`; null on every other event. */
  interval?: {
    join?: { users?: string[] };
    leave?: { users?: string[] };
    timeout?: { users?: string[] };
  } | null;
}

/**
 * Membership changes implied by one presence event.
 *
 * @param event - The SDK event, as delivered.
 * @param selfId - The local user, who is never reported: the roster already knows
 *   it is here, and a self LEAVE would evict the local user from their own party.
 * @returns Zero or more changes, in the order they should be applied.
 */
export function presenceMemberEvents(
  event: RtmPresenceEvent,
  selfId?: string,
): PresenceMemberEvent[] {
  const out: PresenceMemberEvent[] = [];
  const add = (action: PresenceAction, userId: string | undefined) => {
    if (!userId || userId === selfId) return;
    out.push({ action, userId });
  };

  switch (event.eventType) {
    case 'REMOTE_JOIN':
      add('JOIN', event.publisher);
      break;
    case 'REMOTE_LEAVE':
    case 'REMOTE_TIMEOUT':
      add('LEAVE', event.publisher);
      break;
    case 'SNAPSHOT':
      for (const user of event.snapshot ?? []) add('JOIN', user?.userId);
      break;
    case 'INTERVAL':
      for (const id of event.interval?.join?.users ?? []) add('JOIN', id);
      for (const id of event.interval?.leave?.users ?? []) add('LEAVE', id);
      for (const id of event.interval?.timeout?.users ?? []) add('LEAVE', id);
      break;
    default:
      // REMOTE_STATE_CHANGED, NONE, ERROR_OUT_OF_SERVICE. Nothing here tracks
      // user state, so these carry no membership information.
      break;
  }

  return out;
}
