import { describe, expect, it } from 'vitest';
import {
  ROOM,
  SCREEN,
  SEAT_FOV_ABSOLUTE_MAX_DEG,
  SEAT_FOV_MAX_DEG,
  SEAT_FOV_MIN_DEG,
  SEAT_MAX_DOLLY,
  SEAT_PITCH,
  SEAT_X,
  SEATS,
  STAIRS,
  seatCamera,
} from '@/features/watch-party/theatre/lib/layout';

/** Chair width measured from the Blender scene, metres. */
const CHAIR_WIDTH = 0.719;
const R = 180 / Math.PI;

describe('seat spacing', () => {
  it('leaves real room between chairs', () => {
    // Was 0.90 m pitch against 0.719 m chairs: a 0.18 m gap, which read as a
    // bench rather than eight separate recliners.
    expect(SEAT_PITCH).toBeGreaterThan(1.0);
    expect(SEAT_PITCH - CHAIR_WIDTH).toBeGreaterThan(0.4);
  });

  it('is evenly spaced at exactly the stated pitch', () => {
    for (let i = 1; i < SEAT_X.length; i += 1) {
      expect(SEAT_X[i] - SEAT_X[i - 1]).toBeCloseTo(SEAT_PITCH, 6);
    }
  });

  it('is symmetric about the room centre line', () => {
    const sum = SEAT_X.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 6);
  });

  it('keeps every chair clear of the aisle stairs', () => {
    // The whole reason the stairs were narrowed. If this fails, a chair is
    // intersecting a stair run.
    for (const x of SEAT_X) {
      const outerEdge = Math.abs(x) + CHAIR_WIDTH / 2;
      expect(outerEdge).toBeLessThan(STAIRS.innerX);
    }
  });

  it('keeps every chair inside the room', () => {
    for (const x of SEAT_X) {
      expect(Math.abs(x) + CHAIR_WIDTH / 2).toBeLessThan(ROOM.maxX);
    }
  });
});

describe('stairs', () => {
  it('is a narrower run than the 2.2 m it started at', () => {
    expect(STAIRS.outerX - STAIRS.innerX).toBeLessThan(1.5);
  });

  it('is still wide enough to walk up', () => {
    expect(STAIRS.outerX - STAIRS.innerX).toBeGreaterThanOrEqual(1.0);
  });

  it('still reaches the side wall, so there is no gap to fall down', () => {
    expect(STAIRS.outerX).toBe(ROOM.maxX);
  });

  it('spans the full height between the two floor levels', () => {
    expect(STAIRS.risers * STAIRS.riserHeight).toBeCloseTo(0.45, 6);
  });
});

describe('computed seat aim', () => {
  it('points every seat at the screen, not past it', () => {
    for (const s of SEATS) {
      // Turning from the seat toward screen centre must be toward the centre
      // line: a seat left of centre turns right and vice versa.
      if (s.position.x < -0.01) expect(s.view.yaw).toBeLessThan(0);
      if (s.position.x > 0.01) expect(s.view.yaw).toBeGreaterThan(0);
    }
  });

  it('looks up from the front row and nearly level from the rear', () => {
    const a = SEATS.find((s) => s.id === 'A2');
    const b = SEATS.find((s) => s.id === 'B2');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (!a || !b) return;
    // Both rows are below screen centre (2.084 m) so both look up, but the rear
    // row is further away and therefore flatter.
    expect(a.view.pitch).toBeGreaterThan(0);
    expect(b.view.pitch).toBeGreaterThan(0);
    expect(a.view.pitch).toBeGreaterThan(b.view.pitch);
  });

  it('aims outer seats further round than inner ones', () => {
    const a1 = SEATS.find((s) => s.id === 'A1');
    const a2 = SEATS.find((s) => s.id === 'A2');
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    if (!a1 || !a2) return;
    expect(Math.abs(a1.view.yaw)).toBeGreaterThan(Math.abs(a2.view.yaw));
  });

  it('is mirror-symmetric left to right', () => {
    const pairs: Array<[string, string]> = [
      ['A1', 'A4'],
      ['A2', 'A3'],
      ['B1', 'B4'],
      ['B2', 'B3'],
    ];
    for (const [l, r] of pairs) {
      const ls = SEATS.find((s) => s.id === l);
      const rs = SEATS.find((s) => s.id === r);
      expect(ls).toBeDefined();
      expect(rs).toBeDefined();
      if (!ls || !rs) continue;
      expect(ls.view.yaw).toBeCloseTo(-rs.view.yaw, 6);
      expect(ls.view.pitch).toBeCloseTo(rs.view.pitch, 6);
    }
  });

  it('keeps the head clamp centred on the seat, not on an old baked angle', () => {
    for (const s of SEATS) {
      expect(s.view.yaw).toBeGreaterThan(s.view.yawMin);
      expect(s.view.yaw).toBeLessThan(s.view.yawMax);
      const mid = (s.view.yawMin + s.view.yawMax) / 2;
      expect(mid).toBeCloseTo(s.view.yaw, 6);
    }
  });
});

/**
 * Independent frustum containment test.
 *
 * Deliberately does NOT reuse the half-angle helpers `seatCamera` is built from,
 * so a sign error in those would fail here rather than cancel out. Builds the
 * frustum from the returned FOV and checks all four screen corners fall inside.
 */
function screenFitsFrom(
  eye: { x: number; y: number; z: number },
  aspect: number,
): boolean {
  const { fovDeg, dolly } = seatCamera(eye, aspect);
  const halfV = fovDeg / R / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const depth = eye.z - SCREEN.z + dolly;
  const centreH = Math.atan2(-eye.x, depth);
  const centreV = Math.atan2(SCREEN.centreY - eye.y, depth);

  for (const cx of [SCREEN.minX, SCREEN.maxX]) {
    for (const cy of [SCREEN.bottomY, SCREEN.topY]) {
      const h = Math.atan2(cx - eye.x, depth) - centreH;
      const v = Math.atan2(cy - eye.y, depth) - centreV;
      if (Math.abs(h) > halfH || Math.abs(v) > halfV) return false;
    }
  }
  return true;
}

describe('seat camera framing', () => {
  // Ultrawide through to a window taller than it is wide.
  const ASPECTS = [
    21 / 9,
    16 / 9,
    16 / 10,
    3 / 2,
    4 / 3,
    1.15,
    1,
    0.8,
    0.6,
    0.5,
  ];

  it('never crops the screen, from any seat, at any aspect ratio', () => {
    for (const s of SEATS) {
      for (const aspect of ASPECTS) {
        expect(
          screenFitsFrom(s.eye, aspect),
          `${s.id} at aspect ${aspect.toFixed(3)}`,
        ).toBe(true);
      }
    }
  });

  it('needs no dolly and a sane lens on an ordinary 16:9 window', () => {
    // The common case must be indistinguishable from the old fixed 60 degrees,
    // or this "fix" would visibly change the view for everyone.
    for (const s of SEATS) {
      const { fovDeg, dolly } = seatCamera(s.eye, 16 / 9);
      expect(dolly).toBe(0);
      expect(fovDeg).toBeLessThan(65);
      expect(fovDeg).toBeGreaterThanOrEqual(SEAT_FOV_MIN_DEG);
    }
  });

  it('widens the lens before it moves the viewer', () => {
    // At a mildly narrow window the FOV should absorb it entirely.
    for (const s of SEATS) {
      const { dolly } = seatCamera(s.eye, 4 / 3);
      expect(dolly).toBe(0);
    }
  });

  it('only moves back once the lens is at its limit', () => {
    const a1 = SEATS.find((s) => s.id === 'A1');
    expect(a1).toBeDefined();
    if (!a1) return;
    const { fovDeg, dolly } = seatCamera(a1.eye, 1);
    expect(dolly).toBeGreaterThan(0);
    expect(fovDeg).toBeCloseTo(SEAT_FOV_MAX_DEG, 3);
  });

  it('respects both limits', () => {
    for (const s of SEATS) {
      for (const aspect of ASPECTS) {
        const { fovDeg, dolly } = seatCamera(s.eye, aspect);
        expect(dolly).toBeGreaterThanOrEqual(0);
        expect(dolly).toBeLessThanOrEqual(SEAT_MAX_DOLLY + 1e-9);
        expect(fovDeg).toBeLessThanOrEqual(SEAT_FOV_ABSOLUTE_MAX_DEG + 1e-9);
      }
    }
  });

  it('keeps the dollied viewpoint inside the room', () => {
    for (const s of SEATS) {
      for (const aspect of ASPECTS) {
        const { dolly } = seatCamera(s.eye, aspect);
        expect(s.eye.z + dolly).toBeLessThanOrEqual(ROOM.maxZ);
      }
    }
  });

  it('asks for a wider lens the narrower the window gets', () => {
    const a1 = SEATS.find((s) => s.id === 'A1');
    expect(a1).toBeDefined();
    if (!a1) return;
    let prev = 0;
    for (const aspect of [21 / 9, 16 / 9, 4 / 3, 1]) {
      const { fovDeg } = seatCamera(a1.eye, aspect);
      expect(fovDeg).toBeGreaterThanOrEqual(prev);
      prev = fovDeg;
    }
  });

  it('survives a degenerate aspect ratio instead of returning NaN', () => {
    // A zero-height container during layout would otherwise divide by zero.
    const { fovDeg, dolly } = seatCamera(SEATS[0].eye, 0);
    expect(Number.isFinite(fovDeg)).toBe(true);
    expect(Number.isFinite(dolly)).toBe(true);
  });
});
