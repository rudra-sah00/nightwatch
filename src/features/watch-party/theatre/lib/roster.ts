/**
 * Who is actually in the room, for the 3D scene.
 *
 * Departure is messier than it looks, and the theatre was listening to the wrong
 * signal. There are three ways someone stops being present:
 *
 *  1. Agora presence `LEAVE` — a closed tab or a dropped connection. This does
 *     NOT remove them from `room.members`; it sets `disconnected: true` and, if a
 *     host is present, starts a two-minute grace timer before an auto-kick.
 *  2. RTM `MEMBER_LEFT` — a deliberate exit. Nothing in the frontend emits this,
 *     so it depends entirely on the backend sending it.
 *  3. `KICK` / `PARTY_CLOSED`.
 *
 * The theatre only ever subscribed to (2), so a dropped peer stayed in their
 * chair indefinitely: their avatar was drawn from `room.members`, which still
 * contained them, merely flagged `disconnected`. A live 3D peer fared slightly
 * better but still stood frozen until the `STALE_MS` sweep noticed the silence.
 *
 * Rather than chase every event, the scene now RECONCILES against the member
 * list on each change. That is idempotent and self-healing: it does not matter
 * which of the three signals fired, or whether one was missed, because anyone
 * absent from the roster is dropped on the next pass.
 */

/** Minimal shape needed to decide presence. */
export interface RosterMember {
  id?: string | null;
  name?: string | null;
  disconnected?: boolean;
}

/**
 * Ids of members currently present, for drawing.
 *
 * `disconnected` members are excluded. They are still in `room.members` on
 * purpose — the 2D UI greys them out during the grace period so a brief network
 * blip does not erase someone mid-film — but a greyed-out row and a body sitting
 * in a chair are different claims. A chair is either occupied or it is not.
 */
export function presentMemberIds(
  members: readonly (RosterMember | null | undefined)[] | null | undefined,
): string[] {
  if (!members) return [];
  const out: string[] = [];
  for (const m of members) {
    if (!m) continue;
    if (m.disconnected) continue;
    if (typeof m.id !== 'string' || m.id.length === 0) continue;
    out.push(m.id);
  }
  return out;
}

export interface ReconcileInput {
  /** Peers the network layer currently holds pose buffers for. */
  knownPeerIds: readonly string[];
  /** Ids the party roster says are present, from `presentMemberIds`. */
  presentIds: readonly string[];
  /**
   * Peers the roster has confirmed at least once.
   *
   * A pose can arrive before `MEMBER_JOINED` propagates into `room.members` —
   * the network hook deliberately trusts an unknown pose rather than dropping
   * it. Reconciling without this set would cull that peer on the very next pass
   * and make a joining avatar flicker in and straight back out.
   */
  acknowledged: ReadonlySet<string>;
}

/**
 * Which peers should be despawned.
 *
 * Returns nothing while `presentIds` is empty. An empty roster means it has not
 * loaded yet, not that the party is deserted — the local user is always a member
 * of their own party, so a genuinely populated roster is never empty. Without
 * this guard the first render would wipe every avatar in the room.
 */
export function peersToDrop({
  knownPeerIds,
  presentIds,
  acknowledged,
}: ReconcileInput): string[] {
  if (presentIds.length === 0) return [];

  const present = new Set(presentIds);
  const drop: string[] = [];

  for (const id of knownPeerIds) {
    if (present.has(id)) continue;
    // Not in the roster — but only removable once the roster has vouched for
    // them, otherwise this races with a just-arrived pose.
    if (!acknowledged.has(id)) continue;
    drop.push(id);
  }

  return drop;
}

/**
 * userId -> display name, taken from the party roster.
 *
 * The 3D labels used to learn names ONLY from chat messages, via
 * `useSpeechBubbles`. That meant a name appeared above someone's head the moment
 * they typed and never before, so a member who was simply watching had no name at
 * all and fell back to a slice of their raw user id — which for a guest reads as
 * `guest_2f`. The sidebar had the name the whole time, from `room.members`.
 *
 * Roster names are used first and chat names only fill gaps, so the tag over an
 * avatar matches the sidebar rather than being a second, staler source.
 *
 * Disconnected members are intentionally still included: presence and naming are
 * separate questions, and dropping the name of someone in their grace period
 * would make a reconnect flash an id.
 */
export function memberNames(
  members: readonly (RosterMember | null | undefined)[] | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!members) return out;
  for (const m of members) {
    if (!m) continue;
    if (typeof m.id !== 'string' || m.id.length === 0) continue;
    if (typeof m.name !== 'string') continue;
    const name = m.name.trim();
    if (name.length === 0) continue;
    out[m.id] = name;
  }
  return out;
}

/**
 * What to actually print above an avatar.
 *
 * Mirrors the convention already used by the soundboard, gesture and tile
 * components: a known name, else `Guest` for a guest id, else `Member`. Never a
 * raw id — an 8-character slice of `guest_a1b2c3` is noise, and it was what this
 * showed for anyone who had not spoken.
 */
export function displayName(userId: string, name?: string | null): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed.length > 0) return trimmed;
  return userId.startsWith('guest') ? 'Guest' : 'Member';
}
