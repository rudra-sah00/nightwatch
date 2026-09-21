'use client';

/**
 * Live performance and network readout for the 3D theatre.
 *
 * Deliberately measures only things that are actually true.
 *
 * A real one-way latency figure is NOT available here. Every pose message
 * carries `t: Date.now()` from the SENDER's clock, and browser clocks are not
 * synchronised — subtracting them yields network delay plus an unknown clock
 * skew that is routinely hundreds of milliseconds and can be negative. Printing
 * that as "ping" would be a fabricated number. A trustworthy RTT needs a
 * round trip (send a token, have the peer echo it, halve the elapsed time on the
 * ORIGINATING clock), which is a protocol addition rather than a measurement.
 *
 * What is measured instead is derived purely from local-clock deltas, so it is
 * exact:
 *
 *  - `frameMs` / `fps`  — render cost, from the r3f clock.
 *  - `packetAgeMs`      — how long since the newest pose arrived. This is the
 *                         number that actually answers "is it real time": if it
 *                         sits near the 2 s heartbeat nobody is moving, and if it
 *                         climbs past that the link has stalled.
 *  - `packetHz`         — measured inbound pose rate, against the 8 Hz cap.
 *  - `interpDelayMs`    — the fixed delay we deliberately add to smooth motion.
 *                         Part of what you see is this, by design, not lag.
 *
 * The object is mutated in place and polled, rather than held in React state:
 * writing FPS into state would re-render the tree every frame, which would cost
 * more than it reports.
 */

import { THEATRE_NET } from './interpolation';

export interface TheatreStats {
  fps: number;
  frameMs: number;
  /**
   * LOCAL clock time the most recent inbound pose arrived, or null before the
   * first one.
   *
   * Stored as a timestamp rather than an age so the readout keeps counting up
   * while nothing arrives. A precomputed age would freeze at whatever it was
   * when the last packet landed, which is precisely the case you need to see.
   */
  lastPacketAt: number | null;
  /** Measured inbound poses per second, all peers combined. */
  packetHz: number;
  /** Peers we are tracking. */
  peers: number;
  /** Interpolation delay we add on purpose, ms. */
  interpDelayMs: number;
}

export function createStats(): TheatreStats {
  return {
    fps: 0,
    frameMs: 0,
    lastPacketAt: null,
    packetHz: 0,
    peers: 0,
    interpDelayMs: THEATRE_NET.INTERP_DELAY_MS,
  };
}

/**
 * Sliding window of packet arrival times, in LOCAL clock ms.
 *
 * Local arrival times only — never the sender's `t` — so the rate and age are
 * immune to clock skew between machines.
 */
export class PacketRateMeter {
  private arrivals: number[] = [];
  private last: number | null = null;

  /** Record one inbound message. */
  mark(now: number = Date.now()): void {
    this.last = now;
    this.arrivals.push(now);
    const cutoff = now - 1000;
    while (this.arrivals.length > 0 && this.arrivals[0] < cutoff) {
      this.arrivals.shift();
    }
  }

  /** Messages in the last second. */
  hz(now: number = Date.now()): number {
    const cutoff = now - 1000;
    let n = 0;
    for (let i = this.arrivals.length - 1; i >= 0; i -= 1) {
      if (this.arrivals[i] < cutoff) break;
      n += 1;
    }
    return n;
  }

  /** ms since the newest message, or null if none has arrived. */
  ageMs(now: number = Date.now()): number | null {
    return this.last === null ? null : Math.max(0, now - this.last);
  }

  /** Local clock time of the newest message, or null if none has arrived. */
  lastAt(): number | null {
    return this.last;
  }

  reset(): void {
    this.arrivals = [];
    this.last = null;
  }
}

/**
 * How to colour a packet age.
 *
 * Thresholds come from the protocol, not taste: a silent client still sends a
 * heartbeat every `HEARTBEAT_MS`, so anything under that is healthy even with
 * nobody moving. Past one heartbeat something is late; past two, the link is
 * likely gone and `STALE_MS` will eventually cull the peer.
 */
export function packetHealth(
  ageMs: number | null,
): 'idle' | 'good' | 'late' | 'stalled' {
  if (ageMs === null) return 'idle';
  if (ageMs <= THEATRE_NET.HEARTBEAT_MS) return 'good';
  if (ageMs <= THEATRE_NET.HEARTBEAT_MS * 2) return 'late';
  return 'stalled';
}
