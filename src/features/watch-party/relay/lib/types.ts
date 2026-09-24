/**
 * Payload shapes for the relay's JSON events.
 *
 * The binary channel is described by `codec.ts`; this covers the rest. Kept separate
 * from `codec.ts` because that file is vendored byte-identically into the backend and
 * must have no imports — these types are frontend-side only.
 *
 * @packageDocumentation
 */

/** One present member, as the relay reports them. */
export interface RosterEntry {
  /** Index this member's poses carry in a batch. Valid only against `rosterGen`. */
  slot: number;
  userId: string;
  /** Resolved server-side from the room document, never from the client. */
  userName: string;
  /** Chosen avatar body. Absent until the member announces it. */
  character?: 'm' | 'w';
}

/** A seat claim the relay observed and is replaying. */
export interface RelaySeatClaim {
  userId: string;
  seatId: string | null;
  /** Claim time. The only field the deterministic contest is decided on. */
  at: number;
}

/**
 * The relay's opening message.
 *
 * Carries the tick contract as DATA rather than as compiled-in constants, so the send
 * rate and the interpolation delay can be retuned from measured jitter without shipping
 * a frontend release.
 */
export interface RelayHello {
  selfSlot: number;
  rosterGen: number;
  roster: RosterEntry[];
  /**
   * Claims observed so far.
   *
   * This is what retires the "each seated client re-asserts its own claim on
   * `MEMBER_JOINED`" mechanism in `use-seat-occupancy.ts`. That exists only because a
   * late joiner never heard the claims that already fired; a relay that saw them all
   * can simply say so. The relay is still not an arbiter — it reports what it observed
   * and every client applies its own `applyClaim`.
   */
  seats: RelaySeatClaim[];
  tickHz: number;
  /** Interpolation delay the relay wants clients to use, ms. */
  interpDelayMs: number;
  /** Time origin for batch ticks, so `tick` fits a uint32. */
  roomEpoch: number;
  serverTime: number;
  /** When the presented token expires, ms epoch. Drives renewal. */
  authExpiresAt: number;
}

export interface RelayRosterUpdate {
  rosterGen: number;
  roster: RosterEntry[];
}

export interface RelayError {
  code: string;
  message: string;
}

export interface RelayGoaway {
  reason: string;
  reconnectAfterMs: number;
}

/** A remote sketch cursor. Coordinates are normalised 0..1, not pixels. */
export interface RelayCursor {
  slot: number;
  x: number;
  y: number;
}

/** Which transport a connection settled on, for diagnostics and the stats readout. */
export type RelayRung = 'relay' | 'reconnecting' | 'offline';
