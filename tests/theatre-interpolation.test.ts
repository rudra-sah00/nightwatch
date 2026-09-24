import { describe, expect, it } from 'vitest';
import {
  exceedsDeadBand,
  type Pose,
  quantise,
  SnapshotBuffer,
  THEATRE_NET,
} from '../src/features/watch-party/theatre/lib/interpolation';

const snap = (t: number, over: Partial<Pose> = {}) => ({
  x: 0,
  y: 0,
  z: 0,
  r: 0,
  s: 'walk',
  ...over,
  t,
});

describe('SnapshotBuffer — interpolation', () => {
  it('returns null with no samples', () => {
    expect(new SnapshotBuffer().sample(1000)).toBeNull();
  });

  it('returns the only known pose before a second sample arrives', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { x: 5 }));
    expect(buffer.sample(9_999_999)?.x).toBe(5);
  });

  it('interpolates halfway between two straddling samples', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { x: 0 }));
    buffer.push(snap(1100, { x: 10 }));
    // Render 100 ms in the past from t=1150 → target 1050, halfway.
    expect(buffer.sample(1150, 100)?.x).toBeCloseTo(5, 6);
  });

  it('holds position past the newest sample rather than extrapolating', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { x: 0 }));
    buffer.push(snap(1100, { x: 10 }));
    // A seated avatar that stopped sending must not drift off across the room.
    expect(buffer.sample(5000, 100)?.x).toBeCloseTo(10, 6);
  });

  it('takes the shortest path around the compass', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { r: 350 }));
    buffer.push(snap(1100, { r: 10 }));
    // 350 -> 10 must turn 20 degrees forwards, not 340 backwards.
    const r = buffer.sample(1150, 100)?.r as number;
    expect(((r % 360) + 360) % 360).toBeCloseTo(0, 5);
  });

  it('never blends animation state, and takes the earlier one', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { s: 'walk' }));
    buffer.push(snap(1100, { s: 'idle' }));
    // Discrete: the clip change lands with the movement it belongs to.
    expect(buffer.sample(1150, 100)?.s).toBe('walk');
  });

  it('inserts an out-of-order snapshot by timestamp', () => {
    const buffer = new SnapshotBuffer();
    // Pushed 1200 first, then 1000, then 1100 — the buffer must reorder them.
    const buffer2 = new SnapshotBuffer();
    buffer.push(snap(1200, { x: 20 }));
    buffer.push(snap(1000, { x: 0 }));
    buffer.push(snap(1100, { x: 10 }));
    // In-order control, for the same target.
    buffer2.push(snap(1000, { x: 0 }));
    buffer2.push(snap(1100, { x: 10 }));
    buffer2.push(snap(1200, { x: 20 }));
    // Target 1050 straddles the FIRST two samples, so 5 either way — and the two
    // buffers must agree, which is what proves the reordering happened.
    expect(buffer.sample(1150, 100)?.x).toBeCloseTo(5, 6);
    expect(buffer.sample(1150, 100)?.x).toBeCloseTo(
      buffer2.sample(1150, 100)?.x as number,
      6,
    );
  });

  it('honours a caller-supplied delay over the built-in default', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(1000, { x: 0 }));
    buffer.push(snap(2000, { x: 100 }));
    // The relay sends interpDelayMs in `hello` so it can be retuned server-side.
    expect(buffer.sample(2000, 1000)?.x).toBeCloseTo(0, 6);
    expect(buffer.sample(2000, 500)?.x).toBeCloseTo(50, 6);
  });

  it('prunes snapshots older than BUFFER_MS but always keeps two', () => {
    const buffer = new SnapshotBuffer();
    for (let i = 0; i < 40; i += 1) {
      buffer.push(snap(1000 + i * 100, { x: i }));
    }
    // Still interpolates near the newest, so pruning kept what mattered.
    expect(buffer.latest?.x).toBe(39);
    expect(buffer.sample(1000 + 39 * 100, 100)?.x).toBeCloseTo(38, 6);
  });
});

/*
  ---- THE REGRESSION TEST ----

  This is the bug the relay exists to remove, and it is the one test here that would
  FAIL against the previous design.

  Before: senders stamped `t = Date.now()` and receivers sampled with their own
  `Date.now()`. Both numbers were absolute wall-clock times from different machines, so
  the interpolation window was `INTERP_DELAY_MS ± skew`, and for a peer whose clock ran
  more than the delay behind, `target >= newest.t` held on EVERY call — the
  hold-at-newest branch ran and there was no interpolation at all. That avatar stepped
  at the send rate rather than walking.

  After: `t` is the relay's tick and the caller passes server time, so the two are in
  one frame by construction. The test below proves the sampled pose is identical
  whatever the offset between the local clock and the server's, because the local clock
  never enters the calculation.
*/
describe('SnapshotBuffer — immunity to clock skew', () => {
  const buildBuffer = (serverEpoch: number) => {
    const buffer = new SnapshotBuffer();
    buffer.push(snap(serverEpoch + 0, { x: 0 }));
    buffer.push(snap(serverEpoch + 100, { x: 10 }));
    return buffer;
  };

  it('samples identically at any clock offset', () => {
    const delay = 100;
    const results: number[] = [];

    // Three machines whose clocks disagree by ±5 seconds. Each holds snapshots stamped
    // in SERVER time and samples in SERVER time, so all three must agree exactly.
    for (const offset of [0, 5000, -5000]) {
      const serverEpoch = 1_000_000;
      const buffer = buildBuffer(serverEpoch);
      // The client converts its own monotonic reading into server time before sampling;
      // the offset it applies is exactly what cancels its skew.
      const localMono = 500 + offset;
      const serverNow = localMono - offset + serverEpoch + 150 - 500;
      results.push(buffer.sample(serverNow, delay)?.x as number);
    }

    expect(results[0]).toBeCloseTo(5, 6);
    expect(results[1]).toBeCloseTo(results[0], 6);
    expect(results[2]).toBeCloseTo(results[0], 6);
  });

  it('still interpolates for a peer whose wall clock is far behind', () => {
    /*
      The exact shape of the old failure. A peer 5 seconds behind used to produce
      snapshots stamped 5 s in the past, so `renderTime - INTERP_DELAY_MS` was always
      newer than the newest snapshot and the buffer held position for ever.

      With server ticks there is no such thing as a peer's clock, so the same scenario
      interpolates normally.
    */
    const serverEpoch = 2_000_000;
    const buffer = buildBuffer(serverEpoch);
    const sampled = buffer.sample(serverEpoch + 150, 100);
    // Genuinely between the two samples, not pinned to the newest.
    expect(sampled?.x).toBeGreaterThan(0);
    expect(sampled?.x).toBeLessThan(10);
  });

  it('interpolation delay exceeds the send interval, or the buffer runs dry', () => {
    const sendIntervalMs = 1000 / THEATRE_NET.SEND_HZ;
    expect(THEATRE_NET.INTERP_DELAY_MS).toBeGreaterThan(sendIntervalMs);
  });
});

describe('THEATRE_NET budget', () => {
  it('sends at 20 Hz, halving the sampling delay the 8 Hz cap imposed', () => {
    // Agora's SDK ignored publish calls beyond 20/s AND metered per recipient, so 8 Hz
    // was a cost ceiling. Against our own relay a pose is a 10-byte frame.
    expect(THEATRE_NET.SEND_HZ).toBe(20);
    const averageSamplingDelayMs = 1000 / THEATRE_NET.SEND_HZ / 2;
    expect(averageSamplingDelayMs).toBeCloseTo(25, 6);
  });

  it('no longer carries a staleness sweep', () => {
    /*
      Deleting STALE_MS was required, not tidying. Seated avatars stopped heartbeating,
      so a 30 s silence sweep would cull anyone who sat still for half a minute —
      exactly the common case in a cinema. Presence comes from the relay roster instead.
    */
    expect('STALE_MS' in THEATRE_NET).toBe(false);
  });
});

describe('dead band and quantise are unchanged', () => {
  const pose = (over: Partial<Pose> = {}): Pose => ({
    x: 0,
    y: 0,
    z: 0,
    r: 0,
    s: 'idle',
    ...over,
  });

  it('passes the first pose', () => {
    expect(exceedsDeadBand(null, pose())).toBe(true);
  });

  it('swallows movement below POSITION_EPSILON', () => {
    expect(exceedsDeadBand(pose(), pose({ x: 0.01 }))).toBe(false);
  });

  it('passes movement at POSITION_EPSILON', () => {
    expect(
      exceedsDeadBand(pose(), pose({ x: THEATRE_NET.POSITION_EPSILON })),
    ).toBe(true);
  });

  it('passes an animation state change even with no movement', () => {
    expect(exceedsDeadBand(pose(), pose({ s: 'walk' }))).toBe(true);
  });

  it('passes a dance change, which moves no distance at all', () => {
    // Without this the dead band would swallow it and peers would keep the old clip.
    expect(
      exceedsDeadBand(pose({ s: 'dance', d: 0 }), pose({ s: 'dance', d: 2 })),
    ).toBe(true);
  });

  it('quantises to centimetres and whole degrees', () => {
    const q = quantise(pose({ x: 1.23456, r: 45.7 }));
    expect(q.x).toBeCloseTo(1.23, 6);
    expect(q.r).toBe(46);
  });
});
