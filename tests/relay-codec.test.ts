import { describe, expect, it } from 'vitest';
import {
  AVATAR_STATE_WIRE,
  BATCH_HEADER_BYTES,
  CURSOR_UPLINK_BYTES,
  decodeCursor,
  decodePose,
  decodePoseBatch,
  encodeCursor,
  encodePose,
  encodePoseBatch,
  FRAME_POSE_BATCH,
  isNewerSeq,
  POSE_RECORD_BYTES,
  POSE_UPLINK_BYTES,
  packState,
  unpackState,
  type WirePoseRecord,
} from '../src/features/watch-party/relay/lib/codec';
import { DANCE_CLIPS } from '../src/features/watch-party/theatre/lib/animation';
import { THEATRE_NET } from '../src/features/watch-party/theatre/lib/interpolation';
import {
  FLOORS,
  ROOM,
  SEAT_IDS,
  SEATED_AVATAR_LIFT,
  SPAWN,
  seatedAvatarPose,
  stairTreads,
} from '../src/features/watch-party/theatre/lib/layout';

const pose = (over: Partial<WirePoseRecord> = {}): WirePoseRecord => ({
  slot: 0,
  x: 0,
  y: 0,
  z: 0,
  r: 0,
  s: 'idle',
  ...over,
});

describe('relay codec — frame sizes', () => {
  it('encodes a pose in 10 bytes and a cursor in 7', () => {
    expect(encodePose(1, pose()).byteLength).toBe(POSE_UPLINK_BYTES);
    expect(encodePose(1, pose()).byteLength).toBe(10);
    expect(encodeCursor(1, 0.5, 0.5).byteLength).toBe(CURSOR_UPLINK_BYTES);
  });

  it('encodes a 7-mover batch in 63 bytes, against ~840 for 7 JSON messages', () => {
    const poses = Array.from({ length: 7 }, (_, i) => pose({ slot: i }));
    const bytes = encodePoseBatch({ tick: 1000, rosterGen: 0, poses });
    expect(bytes.byteLength).toBe(BATCH_HEADER_BYTES + 7 * POSE_RECORD_BYTES);
    expect(bytes.byteLength).toBe(63);
  });

  it('caps a batch at 255 records, since count is one byte', () => {
    const poses = Array.from({ length: 300 }, (_, i) =>
      pose({ slot: i & 0xff }),
    );
    const decoded = decodePoseBatch(
      encodePoseBatch({ tick: 1, rosterGen: 0, poses }),
    );
    expect(decoded?.poses).toHaveLength(255);
  });
});

/*
  The bounds tests below assert against layout.ts, not against the format's own
  assumptions. That is the point: they are what fails if the room grows a third seat
  row or a taller rear platform, the same way geometry.test.ts fails on a bad chair.
*/
describe('relay codec — bounds against the real room', () => {
  it('survives every corner of the room to within 1 cm', () => {
    for (const x of [ROOM.minX, ROOM.maxX]) {
      for (const z of [ROOM.minZ, ROOM.maxZ]) {
        const decoded = decodePose(encodePose(0, pose({ x, z })));
        expect(decoded?.pose.x).toBeCloseTo(x, 2);
        expect(decoded?.pose.z).toBeCloseTo(z, 2);
      }
    }
  });

  it('holds every walkable height in one unsigned byte', () => {
    const heights = [
      FLOORS.front.y,
      FLOORS.rearPlatform.y,
      SPAWN.y,
      ...stairTreads().map((t) => t.top),
      // The tallest thing a pose ever carries: a seated body on the rear platform.
      FLOORS.rearPlatform.y + SEATED_AVATAR_LIFT,
    ];

    for (const y of heights) {
      expect(y).toBeGreaterThanOrEqual(0);
      // The format's ceiling. If this ever fails, y must widen to int16.
      expect(y).toBeLessThanOrEqual(2.55);
      const decoded = decodePose(encodePose(0, pose({ y })));
      expect(decoded?.pose.y).toBeCloseTo(y, 2);
    }
  });

  it('round-trips every seat position a seated avatar can occupy', () => {
    for (const seatId of SEAT_IDS) {
      const seated = seatedAvatarPose(seatId);
      const decoded = decodePose(
        encodePose(
          0,
          pose({
            x: seated.x,
            y: seated.y,
            z: seated.z,
            r: seated.r,
            s: 'sitIdle',
          }),
        ),
      );
      expect(decoded?.pose.x).toBeCloseTo(seated.x, 2);
      expect(decoded?.pose.y).toBeCloseTo(seated.y, 2);
      expect(decoded?.pose.z).toBeCloseTo(seated.z, 2);
      expect(decoded?.pose.s).toBe('sitIdle');
    }
  });

  it('quantises yaw finer than the dead band, so no step is ever visible', () => {
    // 256 steps over 360 degrees = 1.40625 deg. Half of that is the worst error.
    const worstError = 360 / 256 / 2;
    expect(worstError).toBeLessThan(THEATRE_NET.ROTATION_EPSILON);

    for (let deg = 0; deg < 360; deg += 7) {
      const decoded = decodePose(encodePose(0, pose({ r: deg })));
      const error = Math.abs(
        (((decoded?.pose.r ?? 0) - deg + 540) % 360) - 180,
      );
      expect(error).toBeLessThanOrEqual(worstError + 1e-9);
    }
  });

  it('quantises position finer than the dead band', () => {
    // 1 cm resolution against a 2 cm epsilon.
    expect(0.01).toBeLessThan(THEATRE_NET.POSITION_EPSILON);
  });

  it('wraps yaw instead of clamping it, so 370 and 10 agree', () => {
    const a = decodePose(encodePose(0, pose({ r: 370 })));
    const b = decodePose(encodePose(0, pose({ r: 10 })));
    expect(a?.pose.r).toBeCloseTo(b?.pose.r ?? -1, 5);
  });

  it('clamps out-of-range values rather than wrapping them', () => {
    // A wrap would teleport an avatar to the opposite wall, which is far worse than
    // pinning it to the edge of what the format can say.
    const high = decodePose(encodePose(0, pose({ x: 9999, y: 9999 })));
    expect(high?.pose.x).toBeCloseTo(327.67, 2);
    expect(high?.pose.y).toBeCloseTo(2.55, 2);
    const low = decodePose(encodePose(0, pose({ x: -9999, y: -50 })));
    expect(low?.pose.x).toBeCloseTo(-327.68, 2);
    expect(low?.pose.y).toBe(0);
  });
});

describe('relay codec — state byte', () => {
  it('matches the AvatarState union in animation.ts', () => {
    // animation.ts is the source of truth for the union; this list is the wire order.
    // If a state is added there and not here, it silently encodes as 'idle'.
    const fromAnimation = [
      'idle',
      'walk',
      'sitDown',
      'sitIdle',
      'standUp',
      'dance',
    ];
    expect([...AVATAR_STATE_WIRE]).toEqual(fromAnimation);
  });

  it('fits every state and every dance clip in one byte', () => {
    expect(AVATAR_STATE_WIRE.length).toBeLessThanOrEqual(8);
    expect(DANCE_CLIPS.length).toBeLessThanOrEqual(8);
  });

  it('round-trips every state', () => {
    for (const s of AVATAR_STATE_WIRE) {
      expect(unpackState(packState(s)).s).toBe(s);
    }
  });

  it('round-trips every dance index while dancing', () => {
    for (let d = 0; d < DANCE_CLIPS.length; d += 1) {
      const decoded = unpackState(packState('dance', d));
      expect(decoded.s).toBe('dance');
      expect(decoded.d).toBe(d);
    }
  });

  it('omits the dance index when not dancing', () => {
    // Carrying it would make exceedsDeadBand see a change on a field nothing renders.
    expect(unpackState(packState('walk', 3)).d).toBeUndefined();
  });

  it('degrades an unknown state to idle rather than throwing', () => {
    expect(unpackState(packState('somethingNew')).s).toBe('idle');
    // A future sender using state index 7, which nothing defines yet.
    expect(unpackState(0x07).s).toBe('idle');
  });
});

describe('relay codec — sequence comparison', () => {
  it('accepts a forward step', () => {
    expect(isNewerSeq(5, 4)).toBe(true);
    // Anything up to half the space ahead reads as forward.
    expect(isNewerSeq(30000, 1)).toBe(true);
    expect(isNewerSeq(32767, 0)).toBe(true);
  });

  it('rejects a duplicate', () => {
    // Accepting equality would let a retransmission overwrite a fresher pose.
    expect(isNewerSeq(7, 7)).toBe(false);
  });

  it('rejects a backward step', () => {
    expect(isNewerSeq(4, 5)).toBe(false);
    expect(isNewerSeq(1, 30000)).toBe(false);
  });

  it('handles wraparound at 65535', () => {
    expect(isNewerSeq(0, 65535)).toBe(true);
    expect(isNewerSeq(3, 65534)).toBe(true);
    expect(isNewerSeq(65534, 3)).toBe(false);
  });

  /*
    A gap larger than half the space is genuinely ambiguous — 40000 ahead and 25536
    behind are the same 16 bits — and the rule resolves it as BEHIND. That is the
    right default here: at the 20 Hz send cap it takes ~27 minutes of continuous
    sending to advance 32768, and a connection silent that long has been
    re-established (and its sequence reset) long before.

    Pinned as a test because it looks like a bug the first time you hit it.
  */
  it('treats a gap beyond half the space as backward, by design', () => {
    expect(isNewerSeq(40000, 1)).toBe(false);
    expect(isNewerSeq(32768, 0)).toBe(false);
  });
});

describe('relay codec — batch', () => {
  it('carries one tick for every pose in it, which is the shared timeline', () => {
    const decoded = decodePoseBatch(
      encodePoseBatch({
        tick: 1234567,
        rosterGen: 9,
        poses: [pose({ slot: 2, x: 1 }), pose({ slot: 5, x: -1 })],
      }),
    );
    expect(decoded?.tick).toBe(1234567);
    expect(decoded?.rosterGen).toBe(9);
    expect(decoded?.poses.map((p) => p.slot)).toEqual([2, 5]);
  });

  it('survives a tick beyond 2^31, since uint32 covers 49 days', () => {
    const big = 3_000_000_000;
    expect(
      decodePoseBatch(
        encodePoseBatch({ tick: big, rosterGen: 0, poses: [pose()] }),
      )?.tick,
    ).toBe(big);
  });

  it('wraps rosterGen at 255 without corrupting the rest of the header', () => {
    const decoded = decodePoseBatch(
      encodePoseBatch({ tick: 10, rosterGen: 256, poses: [pose({ slot: 1 })] }),
    );
    expect(decoded?.rosterGen).toBe(0);
    expect(decoded?.tick).toBe(10);
  });

  it('encodes an empty batch, which is what a fully seated room produces', () => {
    const decoded = decodePoseBatch(
      encodePoseBatch({ tick: 50, rosterGen: 1, poses: [] }),
    );
    expect(decoded?.poses).toEqual([]);
    expect(decoded?.tick).toBe(50);
  });
});

describe('relay codec — malformed input returns null, never throws', () => {
  it('rejects an empty buffer', () => {
    expect(decodePose(new Uint8Array(0))).toBeNull();
    expect(decodePoseBatch(new Uint8Array(0))).toBeNull();
  });

  it('rejects a wrong frame type', () => {
    const bytes = encodePose(1, pose());
    bytes[0] = 0x99;
    expect(decodePose(bytes)).toBeNull();
  });

  it('rejects a pose of the wrong length', () => {
    expect(decodePose(new Uint8Array(9))).toBeNull();
    expect(decodePose(new Uint8Array(11))).toBeNull();
  });

  it('rejects a truncated batch whole, rather than applying it partially', () => {
    // A half-read record would place an avatar at a position decoded from garbage.
    const full = encodePoseBatch({
      tick: 1,
      rosterGen: 0,
      poses: [pose({ slot: 1 }), pose({ slot: 2 })],
    });
    expect(decodePoseBatch(full.slice(0, full.byteLength - 3))).toBeNull();
  });

  it('rejects a batch whose count disagrees with its length', () => {
    const bytes = encodePoseBatch({ tick: 1, rosterGen: 0, poses: [pose()] });
    bytes[6] = 5; // claims five records, carries one
    expect(decodePoseBatch(bytes)).toBeNull();
  });

  it('decodes from a view with a non-zero byteOffset', () => {
    // Socket.IO and Node can hand over a Buffer that is a window onto a larger pool;
    // reading from .buffer without honouring byteOffset would decode neighbouring data.
    const encoded = encodePoseBatch({
      tick: 77,
      rosterGen: 2,
      poses: [pose({ slot: 4, x: 1.23 })],
    });
    const padded = new Uint8Array(encoded.byteLength + 8);
    padded.set(encoded, 8);
    const windowed = new Uint8Array(padded.buffer, 8, encoded.byteLength);
    const decoded = decodePoseBatch(windowed);
    expect(decoded?.tick).toBe(77);
    expect(decoded?.poses[0]?.slot).toBe(4);
    expect(decoded?.poses[0]?.x).toBeCloseTo(1.23, 2);
  });

  it('agrees on the batch frame type constant', () => {
    expect(encodePoseBatch({ tick: 1, rosterGen: 0, poses: [] })[0]).toBe(
      FRAME_POSE_BATCH,
    );
  });
});

describe('relay codec — cursor', () => {
  it('round-trips normalised coordinates', () => {
    for (const [x, y] of [
      [0, 0],
      [1, 1],
      [0.5, 0.25],
      [0.123, 0.987],
    ]) {
      const decoded = decodeCursor(encodeCursor(0, x, y));
      expect(decoded?.x).toBeCloseTo(x, 4);
      expect(decoded?.y).toBeCloseTo(y, 4);
    }
  });

  it('clamps outside 0..1, catching a caller that forgot to normalise', () => {
    const decoded = decodeCursor(encodeCursor(0, 1920, -5));
    expect(decoded?.x).toBe(1);
    expect(decoded?.y).toBe(0);
  });
});
