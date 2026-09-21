/**
 * Snapshot interpolation for remote avatars.
 *
 * Avatar poses arrive over Agora RTM at a low rate (see `THEATRE_NET`), far
 * below frame rate. Rendering them raw looks like teleporting, so each remote
 * avatar keeps a short buffer of timestamped snapshots and is rendered slightly
 * in the past, interpolating between the two straddling samples. This is the
 * standard approach for networked characters and trades a little latency for
 * motion that reads as walking.
 */

/**
 * Network budget.
 *
 * Agora RTM meters channel messages, and avatar transforms are the only
 * repeating message in the system. These numbers keep a full room well inside a
 * sane envelope: 8 walking users at 8 Hz is 64 msg/s, and in practice most of a
 * watch party is seated and still, emitting nothing at all.
 */
export const THEATRE_NET = {
  /** Max transform broadcasts per second, per user. */
  SEND_HZ: 8,
  /** Skip a send if the avatar moved less than this (metres). */
  POSITION_EPSILON: 0.02,
  /** Skip a send if the avatar turned less than this (degrees). */
  ROTATION_EPSILON: 2,
  /**
   * Render remote avatars this far behind the newest snapshot (ms).
   * Must exceed the send interval (125 ms at 8 Hz) or the buffer runs dry and
   * playback stutters.
   */
  INTERP_DELAY_MS: 160,
  /** Discard snapshots older than this. */
  BUFFER_MS: 1000,
  /** Treat a peer as gone if silent for this long. */
  STALE_MS: 15000,
} as const;

export interface Snapshot {
  x: number;
  y: number;
  z: number;
  /** yaw, degrees */
  r: number;
  /** animation state key */
  s: string;
  /** sender timestamp, ms */
  t: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  r: number;
  s: string;
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Shortest-path angle interpolation so 350° -> 10° turns 20°, not 340°. */
function lerpAngle(a: number, b: number, k: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * k;
}

/**
 * Fixed-capacity, time-ordered snapshot buffer for one remote avatar.
 */
export class SnapshotBuffer {
  private items: Snapshot[] = [];
  private lastSeen = 0;

  push(snap: Snapshot, now: number = Date.now()): void {
    this.lastSeen = now;
    // Out-of-order arrival is possible; insert by timestamp rather than append.
    const i = this.items.findIndex((s) => s.t > snap.t);
    if (i === -1) this.items.push(snap);
    else this.items.splice(i, 0, snap);

    const cutoff = snap.t - THEATRE_NET.BUFFER_MS;
    while (this.items.length > 2 && this.items[0].t < cutoff) {
      this.items.shift();
    }
  }

  /** True when the peer has gone quiet long enough to remove. */
  isStale(now: number = Date.now()): boolean {
    return this.lastSeen > 0 && now - this.lastSeen > THEATRE_NET.STALE_MS;
  }

  get latest(): Snapshot | null {
    return this.items.length ? this.items[this.items.length - 1] : null;
  }

  /**
   * Pose at `renderTime`, interpolated between the straddling snapshots.
   *
   * Before the first two samples arrive this returns the single known pose, and
   * past the newest sample it holds position rather than extrapolating — a
   * seated avatar that stopped sending must not drift.
   */
  sample(renderTime: number): Pose | null {
    if (this.items.length === 0) return null;
    if (this.items.length === 1) {
      const o = this.items[0];
      return { x: o.x, y: o.y, z: o.z, r: o.r, s: o.s };
    }

    const target = renderTime - THEATRE_NET.INTERP_DELAY_MS;

    if (target <= this.items[0].t) {
      const o = this.items[0];
      return { x: o.x, y: o.y, z: o.z, r: o.r, s: o.s };
    }
    const newest = this.items[this.items.length - 1];
    if (target >= newest.t) {
      return {
        x: newest.x,
        y: newest.y,
        z: newest.z,
        r: newest.r,
        s: newest.s,
      };
    }

    for (let i = 0; i < this.items.length - 1; i += 1) {
      const a = this.items[i];
      const b = this.items[i + 1];
      if (target >= a.t && target <= b.t) {
        const span = b.t - a.t;
        const k = span <= 0 ? 0 : (target - a.t) / span;
        return {
          x: lerp(a.x, b.x, k),
          y: lerp(a.y, b.y, k),
          z: lerp(a.z, b.z, k),
          r: lerpAngle(a.r, b.r, k),
          // Animation state is discrete — never blend it, take the earlier one
          // so the clip change lands with the movement it belongs to.
          s: a.s,
        };
      }
    }
    return { x: newest.x, y: newest.y, z: newest.z, r: newest.r, s: newest.s };
  }
}

/** True when a pose has changed enough to be worth a network message. */
export function exceedsDeadBand(last: Pose | null, next: Pose): boolean {
  if (!last) return true;
  if (last.s !== next.s) return true;
  const dx = next.x - last.x;
  const dy = next.y - last.y;
  const dz = next.z - last.z;
  if (Math.hypot(dx, dy, dz) >= THEATRE_NET.POSITION_EPSILON) return true;
  const dr = Math.abs(((next.r - last.r + 540) % 360) - 180);
  return dr >= THEATRE_NET.ROTATION_EPSILON;
}

/** Quantise before sending — trims payload with no visible loss. */
export function quantise(p: Pose): Pose {
  return {
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
    z: Math.round(p.z * 100) / 100,
    r: Math.round(p.r),
    s: p.s,
  };
}
