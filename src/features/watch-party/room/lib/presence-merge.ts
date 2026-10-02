/**
 * Party presence from two sources: Agora RTM presence and the server's socket presence.
 *
 * RTM presence used to be the only signal, and with the Socket.IO relay as a backup it
 * became actively harmful: a member whose RTM drops mid-party is reported LEAVE to
 * everyone while they are still watching over the relay. Everything downstream acts
 * on that — the member is flagged `disconnected` (their 3D avatar vanishes and their
 * seat is freed), the host's client auto-kicks them after two minutes, and if it was
 * the host, every guest is sent home after sixty seconds.
 *
 * So a member is present when EITHER source says so, and gone only when BOTH do.
 * Downstream handlers receive the same `{ action, userId }` events as before, but only
 * on a change of that combined state.
 *
 * A source that has never mentioned a member counts as "not present" for them. That
 * keeps RTM-only behaviour unchanged against a backend without socket presence: the
 * socket side simply never says anything.
 *
 * @packageDocumentation
 */

export interface PresenceChange {
  action: 'JOIN' | 'LEAVE';
  userId: string;
}

export function createPresenceMerger(emit: (change: PresenceChange) => void) {
  const rtm = new Map<string, boolean>();
  let socket = new Set<string>();
  const effective = new Map<string, boolean>();

  const evaluate = (userId: string) => {
    const now = rtm.get(userId) === true || socket.has(userId);
    if (effective.get(userId) === now) return;
    effective.set(userId, now);
    emit({ action: now ? 'JOIN' : 'LEAVE', userId });
  };

  return {
    /** An Agora RTM presence change. */
    rtm(userId: string, online: boolean) {
      rtm.set(userId, online);
      evaluate(userId);
    },
    /** A single server presence change. */
    socket(userId: string, online: boolean) {
      if (online) socket.add(userId);
      else socket.delete(userId);
      evaluate(userId);
    },
    /**
     * The full set of members the server sees in the room, from the join ack.
     *
     * Replaces the previous set, so anyone who left while this client's own socket
     * was disconnected is noticed on rejoin.
     */
    socketSnapshot(userIds: readonly string[]) {
      const previous = socket;
      socket = new Set(userIds);
      for (const id of new Set([...previous, ...socket])) evaluate(id);
    },
    reset() {
      rtm.clear();
      socket = new Set();
      effective.clear();
    },
  };
}
