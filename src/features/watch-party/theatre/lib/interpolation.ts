/**
 * Snapshot interpolation for remote avatars.
 *
 * Avatar poses arrive from the relay at a low rate (see `THEATRE_NET`), far below
 * frame rate. Rendering them raw looks like teleporting, so each remote avatar keeps
 * a short buffer of timestamped snapshots and is rendered slightly in the past,
 * interpolating between the two straddling samples. This is the standard approach for
 * networked characters and trades a little latency for motion that reads as walking.
 *
 * ---- EVERY TIMESTAMP HERE IS SERVER TIME ----
 *
 * `Snapshot.t` is the relay's tick, identical for every pose in a batch and for every
 * client that receives it. `sample()` must be called with server time too — see
 * `relay/lib/clock.ts` for how a client derives it.
 *
 * This was not always so, and the old arrangement was a real bug rather than an
 * imprecision. Senders stamped `t = Date.now()` and receivers compared against their
 * own `Date.now()`, so the interpolation window was `INTERP_DELAY_MS ± skew`. For a
 * peer whose clock ran more than `INTERP_DELAY_MS` behind, `target >= newest.t` held
 * on every call, the hold-at-newest branch ran, and there was NO interpolation at
 * all — that avatar stepped at the send rate. Consumer clocks drift by seconds, so
 * this was likely a worse artefact than anything the network was doing.
 */

/**
 * Network budget.
 *
 * The relay batches poses and fans out one message per client per tick, so these
 * numbers no longer trade against a per-message bill — they trade against CPU on a
 * main thread already running HLS decode and WebGL, and against how far in the past
 * remote avatars are drawn.
 */
export const THEATRE_NET = {
  /**
   * Max transform broadcasts per second, per user.
   *
   * 20 Hz rather than the 8 Hz the Agora path used. Agora's SDK ignored publish calls
   * beyond 20/second and metered every message per recipient, so 8 Hz was a cost
   * ceiling as much as a technical one. Against our own relay the only cost is a 10-byte
   * frame, and the halved sampling delay (62 ms average at 8 Hz, 25 ms at 20 Hz) comes
   * straight off perceived lag.
   */
  SEND_HZ: 20,
  /** Skip a send if the avatar moved less than this (metres). */
  POSITION_EPSILON: 0.02,
  /** Skip a send if the avatar turned less than this (degrees). */
  ROTATION_EPSILON: 2,
  /**
   * Default delay to render remote avatars behind the newest snapshot (ms).
   *
   * A DEFAULT, not the value in force: the relay sends `interpDelayMs` in its `hello`
   * and the caller passes that to `sample()`. Keeping it server-side means the buffer
   * can be retuned from measured jitter without shipping a frontend release, which
   * matters because this number has never been measured — it was guessed, and the
   * buffer needs to cover the p99 tail rather than the average.
   *
   * Must exceed the send interval (50 ms at 20 Hz) or the buffer runs dry between
   * packets and playback stutters.
   */
  INTERP_DELAY_MS: 160,
  /** Discard snapshots older than this. */
  BUFFER_MS: 1000,
  /**
   * Force a pose through the dead band this often, while WALKING only.
   *
   * A moving avatar that stops mid-stride would otherwise freeze one frame short of
   * where it really is. It is deliberately NOT a liveness mechanism any more: presence
   * comes from the relay's roster, and a seated avatar's position is fully derivable
   * from its seat claim — `seatedAvatarPose` derives it and `PassiveAvatars` already
   * draws 2D members that way with no pose traffic at all.
   *
   * Dropping the heartbeat for seated members is the largest single reduction in pose
   * traffic available: in a cinema most people are seated most of the time, and eight
   * seated users on the old 2 s heartbeat cost 32 messages a second for information
   * every client could compute.
   */
  HEARTBEAT_MS: 2000,
} as const;

export interface Snapshot {
  x: number;
  y: number;
  z: number;
  /** yaw, degrees */
  r: number;
  /** animation state key */
  s: string;
  /** which dance, index into DANCE_CLIPS. Only set when `s` is 'dance'. */
  d?: number;
  /**
   * SERVER time, ms — the relay's tick for the batch this pose arrived in.
   *
   * Never a sender's own clock. Every pose in one batch shares this value and every
   * client that receives the batch reads the same number, which is what makes the
   * interpolation window exact rather than `± skew`.
   */
  t: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  r: number;
  s: string;
  /** which dance, index into DANCE_CLIPS. Only set when `s` is 'dance'. */
  d?: number;
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

  push(snap: Snapshot): void {
    // Out-of-order arrival is possible; insert by timestamp rather than append.
    const i = this.items.findIndex((s) => s.t > snap.t);
    if (i === -1) this.items.push(snap);
    else this.items.splice(i, 0, snap);

    const cutoff = snap.t - THEATRE_NET.BUFFER_MS;
    while (this.items.length > 2 && this.items[0].t < cutoff) {
      this.items.shift();
    }
  }

  get latest(): Snapshot | null {
    return this.items.length ? this.items[this.items.length - 1] : null;
  }

  /**
   * Pose at `renderTime`, interpolated between the straddling snapshots.
   *
   * @param renderTime - SERVER time now, from `relay/lib/clock.ts`. Passing a local
   *   `Date.now()` reintroduces the skew bug this class was fixed for.
   * @param delayMs - How far in the past to render. Defaults to
   *   `THEATRE_NET.INTERP_DELAY_MS`, but callers should pass the value the relay sent
   *   in its `hello` so it can be tuned without a client release.
   *
   * Before the first two samples arrive this returns the single known pose, and
   * past the newest sample it holds position rather than extrapolating — a
   * seated avatar that stopped sending must not drift.
   */
  sample(
    renderTime: number,
    delayMs: number = THEATRE_NET.INTERP_DELAY_MS,
  ): Pose | null {
    if (this.items.length === 0) return null;
    if (this.items.length === 1) {
      const o = this.items[0];
      return { x: o.x, y: o.y, z: o.z, r: o.r, s: o.s, d: o.d };
    }

    const target = renderTime - delayMs;

    if (target <= this.items[0].t) {
      const o = this.items[0];
      return { x: o.x, y: o.y, z: o.z, r: o.r, s: o.s, d: o.d };
    }
    const newest = this.items[this.items.length - 1];
    if (target >= newest.t) {
      return {
        x: newest.x,
        y: newest.y,
        z: newest.z,
        r: newest.r,
        s: newest.s,
        d: newest.d,
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
          d: a.d,
        };
      }
    }
    return {
      x: newest.x,
      y: newest.y,
      z: newest.z,
      r: newest.r,
      s: newest.s,
      d: newest.d,
    };
  }
}

/** True when a pose has changed enough to be worth a network message. */
export function exceedsDeadBand(last: Pose | null, next: Pose): boolean {
  if (!last) return true;
  if (last.s !== next.s) return true;
  // Switching dance moves no distance, so without this the dead band would
  // swallow it and peers would keep showing the previous clip.
  if (last.d !== next.d) return true;
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
    d: p.d,
  };
}
