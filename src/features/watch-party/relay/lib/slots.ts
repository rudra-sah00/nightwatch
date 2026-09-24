import type { RosterEntry } from './types';

/**
 * Binding slot indices in a pose batch back to the people they belong to.
 *
 * A pose record carries a `uint8` slot rather than a user id, which is most of why a
 * pose is 8 bytes instead of ~120. The cost is that a slot is meaningless on its own:
 * it only names a person relative to a particular roster.
 *
 * ---- WHY `rosterGen` IS CHEAPER HERE THAN THE DESIGN EXPECTED ----
 *
 * The design assumed poses and roster updates could race, because it planned for two
 * channels — unreliable datagrams for poses and a reliable stream for everything else.
 * With two channels a batch really can overtake the roster that defines its slots, and
 * a freed slot could be redrawn onto its previous occupant.
 *
 * Over one ordered Socket.IO connection that race cannot happen. The relay bumps the
 * generation, broadcasts `roster`, and only then sends a batch stamped with the new
 * generation — all on the same socket, in order. So `roster` always arrives first.
 *
 * The generation check is kept anyway, as a cheap assertion rather than load-bearing
 * machinery: it costs one byte and one comparison, it documents the invariant, and it
 * is exactly what would be needed if poses ever move to a second channel. What it lets
 * us drop is the `acknowledged` set in `theatre/lib/roster.ts`, which exists only
 * because poses (Agora) and the roster (Redis/Socket.IO) are today genuinely different
 * systems.
 *
 * @packageDocumentation
 */

export class SlotTable {
  private generation = -1;
  private slotToUserId = new Map<number, string>();
  private userIdToSlot = new Map<string, number>();
  private entries = new Map<string, RosterEntry>();

  /** Replace the table from a `hello` or `roster` payload. */
  apply(rosterGen: number, roster: readonly RosterEntry[]): void {
    this.generation = rosterGen;
    this.slotToUserId.clear();
    this.userIdToSlot.clear();
    this.entries.clear();
    for (const entry of roster) {
      this.slotToUserId.set(entry.slot, entry.userId);
      this.userIdToSlot.set(entry.userId, entry.slot);
      this.entries.set(entry.userId, entry);
    }
  }

  get rosterGen(): number {
    return this.generation;
  }

  get size(): number {
    return this.slotToUserId.size;
  }

  /**
   * Should a batch stamped with this generation be applied?
   *
   * A mismatch means the batch was numbered against a roster we do not hold. Discarding
   * it costs one tick of motion — invisible at 20 Hz — where applying it could draw a
   * newcomer's pose onto whoever previously held that slot.
   */
  accepts(batchRosterGen: number): boolean {
    return this.generation >= 0 && batchRosterGen === this.generation;
  }

  /** Who holds this slot, or null if the slot is unoccupied. */
  userIdFor(slot: number): string | null {
    return this.slotToUserId.get(slot) ?? null;
  }

  slotFor(userId: string): number | null {
    return this.userIdToSlot.get(userId) ?? null;
  }

  entryFor(userId: string): RosterEntry | null {
    return this.entries.get(userId) ?? null;
  }

  /** Everyone present, ordered by slot so every client renders the same list. */
  roster(): RosterEntry[] {
    return [...this.entries.values()].sort((a, b) => a.slot - b.slot);
  }

  /** Every present user id except the local one — the peer set the scene draws. */
  peerIds(selfUserId: string): string[] {
    return this.roster()
      .map((entry) => entry.userId)
      .filter((id) => id !== selfUserId);
  }

  /**
   * The avatar body a peer chose, or null if unknown.
   *
   * Comes from the roster rather than from pose traffic. Today it rides every
   * `AVATAR_TRANSFORM` as a `c` field, which is wasteful — it is static for a session —
   * and subtly broken: `quantise` covers only position, yaw, state and dance, so
   * `exceedsDeadBand` cannot see a character change, and a player who switches body
   * while standing still produces an identical pose that the dead band drops. On the
   * roster there is no dead band to fall through.
   */
  characterFor(userId: string): 'm' | 'w' | null {
    return this.entries.get(userId)?.character ?? null;
  }

  reset(): void {
    this.generation = -1;
    this.slotToUserId.clear();
    this.userIdToSlot.clear();
    this.entries.clear();
  }
}
