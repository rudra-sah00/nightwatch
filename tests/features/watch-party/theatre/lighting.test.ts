import { describe, expect, it } from 'vitest';
import { FLOORS, GATE, ROOM } from '@/features/watch-party/theatre/lib/layout';
import {
  AMBIENT,
  approach,
  CAFE,
  COVES,
  DIM_FADE_SECONDS,
  HEMI,
  KEY,
  levelValue,
  POINT_FIXTURES,
  targetLevel,
} from '@/features/watch-party/theatre/lib/lighting';

describe('targetLevel', () => {
  it('raises the house lights while walking', () => {
    expect(targetLevel({ seated: false, cinema: false })).toBe(1);
  });

  it('dims once seated — the brief was "when sit down lil bit dim"', () => {
    expect(targetLevel({ seated: true, cinema: false })).toBe(0);
  });

  it('dims in screen-focus mode too', () => {
    expect(targetLevel({ seated: false, cinema: true })).toBe(0);
  });
});

describe('levelValue', () => {
  it('returns the house value at 1 and the dim value at 0', () => {
    const level = { house: 18, dim: 2 };
    expect(levelValue(level, 1)).toBe(18);
    expect(levelValue(level, 0)).toBe(2);
  });

  it('interpolates in between', () => {
    expect(levelValue({ house: 10, dim: 0 }, 0.5)).toBe(5);
  });

  it('clamps out-of-range levels rather than extrapolating', () => {
    const level = { house: 10, dim: 1 };
    expect(levelValue(level, 5)).toBe(10);
    expect(levelValue(level, -3)).toBe(1);
  });
});

describe('approach', () => {
  it('moves toward the target', () => {
    const next = approach(0, 1, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it('is framerate independent — the fade lasts the same wall-clock time', () => {
    // 1 s of animation, stepped at 60 Hz vs 144 Hz, must land in the same place.
    let at60 = 0;
    for (let i = 0; i < 60; i += 1) at60 = approach(at60, 1, 1 / 60);
    let at144 = 0;
    for (let i = 0; i < 144; i += 1) at144 = approach(at144, 1, 1 / 144);
    expect(at60).toBeCloseTo(at144, 3);
  });

  it('is essentially complete after the stated fade duration', () => {
    let v = 0;
    const steps = Math.round(DIM_FADE_SECONDS * 60);
    for (let i = 0; i < steps; i += 1) v = approach(v, 1, 1 / 60);
    expect(v).toBeGreaterThan(0.98);
  });

  it('snaps when given a zero duration', () => {
    expect(approach(0, 1, 1 / 60, 0)).toBe(1);
  });

  it('does not run backwards on a negative delta', () => {
    expect(approach(0.5, 1, -1)).toBe(0.5);
  });
});

describe('the rig itself', () => {
  it('is brighter walking than seated for every fixture', () => {
    for (const f of [...POINT_FIXTURES, ...COVES]) {
      expect(f.level.house).toBeGreaterThan(f.level.dim);
    }
    for (const l of [AMBIENT, HEMI, KEY]) {
      expect(l.house).toBeGreaterThan(l.dim);
    }
  });

  it('never fully extinguishes a fixture, so the room stays navigable', () => {
    // A real auditorium keeps step and aisle lighting on during the film.
    for (const f of [...POINT_FIXTURES, ...COVES]) {
      expect(f.level.dim).toBeGreaterThan(0);
    }
    expect(AMBIENT.dim).toBeGreaterThan(0);
  });

  it('lifts ambient well clear of the value that rendered the room black', () => {
    // The old rig used 0.22 against a 0.195-linear wall albedo, which put the
    // walls at 0.195 * 0.22 / pi ~= 0.014 — about 1% grey.
    expect(AMBIENT.house).toBeGreaterThan(0.6);
    const wallAlbedo = 0.195;
    expect((wallAlbedo * AMBIENT.house) / Math.PI).toBeGreaterThan(0.05);
  });

  it('keeps the step accent barely dimmed — it marks the only trip hazard', () => {
    const step = POINT_FIXTURES.find((f) => f.id === 'step-accent');
    expect(step).toBeDefined();
    if (!step) return;
    expect(step.level.dim / step.level.house).toBeGreaterThan(0.5);
  });

  it('places every fixture inside the room it belongs to', () => {
    const cafeIds = new Set(CAFE.map((f) => f.id));
    for (const f of [...POINT_FIXTURES, ...COVES]) {
      const [x, y, z] = f.position;
      expect(Math.abs(x), f.id).toBeLessThanOrEqual(ROOM.maxX + 0.5);
      expect(y, f.id).toBeGreaterThan(ROOM.floorY);
      if (cafeIds.has(f.id)) {
        // The cafe is its own room through the gate, with a lower ceiling
        // (Cafe_Shell tops out at y 3.60) and its floor at 0.45.
        expect(y, f.id).toBeLessThanOrEqual(3.6);
        expect(z, f.id).toBeGreaterThanOrEqual(FLOORS.cafe.minZ);
        expect(z, f.id).toBeLessThanOrEqual(FLOORS.cafe.maxZ);
      } else {
        expect(y, f.id).toBeLessThanOrEqual(ROOM.wallTopY);
        expect(z, f.id).toBeGreaterThanOrEqual(ROOM.minZ);
        expect(z, f.id).toBeLessThanOrEqual(ROOM.maxZ);
      }
    }
  });

  it('gives the cafe its own fixtures, since no auditorium light reaches it', () => {
    // Every auditorium fixture stops at the back wall; the furthest is the exit
    // glow at z 8.1, and the gate is at 8.6. Without these the cafe rendered as
    // a dark box.
    expect(CAFE.length).toBeGreaterThan(0);
    for (const f of CAFE) {
      expect(f.position[2], f.id).toBeGreaterThan(GATE.z);
    }
  });

  it('keeps the cafe lit while the film runs, like a real lobby', () => {
    // The dim state only means THIS viewer sat down. The cafe may well have
    // someone else in it, and it is visible through the glazed doors.
    for (const f of CAFE) {
      expect(f.level.dim / f.level.house, f.id).toBeGreaterThan(0.3);
    }
  });

  it('bounds every point light, so fragment cost does not scale with the room', () => {
    for (const f of POINT_FIXTURES) {
      expect(f.distance).toBeGreaterThan(0);
    }
  });

  it('stays inside a sane forward-rendering light budget', () => {
    // Plus ambient, hemisphere, one directional, and the screen's own
    // RectAreaLight in TheatreScreen.
    //
    // Raised from 12 to 16 when the cafe was mounted and lit. Every point light
    // is a fixed per-fragment cost in a forward renderer whether or not it can
    // reach the surface being shaded, so a wall does not make its light free —
    // this is a real increase, accepted because the alternative was a dark room.
    // If frame cost becomes a problem the cafe group is the one to gate on
    // proximity, since it is the only group that is out of sight most of the time.
    expect(POINT_FIXTURES.length + COVES.length).toBeLessThanOrEqual(16);
  });

  it('has unique fixture ids, since they are React keys', () => {
    const ids = [...POINT_FIXTURES, ...COVES].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/**
 * Analytic irradiance, as three.js computes it for a point light:
 * `intensity * max(0, N·L) / distance^2`, cut off past `distance`. Ambient and
 * hemisphere are added flat.
 *
 * This is the check that the room is actually VISIBLE, rather than just that the
 * numbers are ordered correctly — the old rig passed every ordering test and
 * still rendered black.
 */
function irradianceAt(p: Vec3, normal: Vec3, level: number): number {
  let e = levelValue(AMBIENT, level) + levelValue(HEMI, level);
  for (const f of POINT_FIXTURES) {
    const dx = f.position[0] - p[0];
    const dy = f.position[1] - p[1];
    const dz = f.position[2] - p[2];
    const d = Math.hypot(dx, dy, dz);
    if (d > f.distance || d < 1e-4) continue;
    const ndl = Math.max(
      0,
      (dx * normal[0] + dy * normal[1] + dz * normal[2]) / d,
    );
    e += (levelValue(f.level, level) * ndl) / (d * d);
  }
  return e;
}

type Vec3 = readonly [number, number, number];

/** three.js `ACESFilmicToneMapping`, scalar path, at TheatreScene's exposure. */
const EXPOSURE = 1.1;
function aces(v: number): number {
  const x = v * (EXPOSURE / 0.6);
  const a = x * (x + 0.0245786) - 0.000090537;
  const b = x * (0.983729 * x + 0.432951) + 0.238081;
  return Math.min(1, Math.max(0, a / b));
}
function srgbEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** What the user's monitor actually shows, 0..255. */
function displayed(
  p: Vec3,
  normal: Vec3,
  albedo: number,
  level: number,
): number {
  const lit = (albedo * irradianceAt(p, normal, level)) / Math.PI;
  return Math.round(srgbEncode(aces(lit)) * 255);
}

/** Linear `baseColorFactor` values read out of the published `room.glb`. */
const CARPET_ALBEDO = 0.021; // NEO_Carpet
const WALL_ALBEDO = 0.195; // NEO_Wall, the walnut veneer
const RISER_ALBEDO = 0.144; // NEO_Riser

const SURFACES: Array<{
  name: string;
  p: Vec3;
  n: Vec3;
  albedo: number;
}> = [
  {
    name: 'carpet @ spawn',
    p: [0, 0.45, 7.8],
    n: [0, 1, 0],
    albedo: CARPET_ALBEDO,
  },
  { name: 'carpet @ mid', p: [0, 0, 4.2], n: [0, 1, 0], albedo: CARPET_ALBEDO },
  {
    name: 'carpet @ front',
    p: [0, 0, 1.5],
    n: [0, 1, 0],
    albedo: CARPET_ALBEDO,
  },
  {
    name: 'carpet @ corner',
    p: [-3.5, 0, 8.2],
    n: [0, 1, 0],
    albedo: CARPET_ALBEDO,
  },
  {
    name: 'wall at sconce',
    p: [-4, 2.2, 2.65],
    n: [1, 0, 0],
    albedo: WALL_ALBEDO,
  },
  {
    name: 'wall between',
    p: [-4, 1.5, 4.5],
    n: [1, 0, 0],
    albedo: WALL_ALBEDO,
  },
  { name: 'wall high', p: [-4, 3.2, 4.5], n: [1, 0, 0], albedo: WALL_ALBEDO },
  { name: 'back wall', p: [0, 1.5, 8.5], n: [0, 0, -1], albedo: WALL_ALBEDO },
  // The riser face looks toward the screen, so its normal is -Z.
  { name: 'riser face', p: [0, 0.2, 5.3], n: [0, 0, -1], albedo: RISER_ALBEDO },
];

describe('measured illumination', () => {
  it('reproduces the reported bug with the old rig, so the fix is anchored', () => {
    // The old rig was ambient 0.22 + hemisphere 0.28 and two aisle point lights
    // that reached almost nothing. Flat-lit, the carpet landed on 1 of 255.
    const oldIrradiance = 0.22 + 0.28;
    const carpet = Math.round(
      srgbEncode(aces((CARPET_ALBEDO * oldIrradiance) / Math.PI)) * 255,
    );
    const wall = Math.round(
      srgbEncode(aces((WALL_ALBEDO * oldIrradiance) / Math.PI)) * 255,
    );
    expect(carpet).toBeLessThanOrEqual(2);
    expect(wall).toBeLessThan(40);
  });

  it('lights the floor enough to walk on, everywhere, house lights up', () => {
    for (const s of SURFACES.filter((x) => x.albedo === CARPET_ALBEDO)) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeGreaterThan(30);
    }
  });

  it('shows the walnut grain on the walls — the reported complaint', () => {
    for (const s of SURFACES.filter((x) => x.albedo === WALL_ALBEDO)) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeGreaterThan(150);
    }
  });

  it('never clips a surface to white, which would erase the texture', () => {
    for (const s of SURFACES) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeLessThan(250);
    }
  });

  it('keeps the whole room visible when dimmed, just darker', () => {
    for (const s of SURFACES) {
      const house = displayed(s.p, s.n, s.albedo, 1);
      const dim = displayed(s.p, s.n, s.albedo, 0);
      expect(dim, `${s.name} dim`).toBeGreaterThan(0);
      expect(dim, `${s.name} dim < house`).toBeLessThan(house);
    }
  });

  it('dims by enough to read as the house lights going down', () => {
    const wall = SURFACES.find((s) => s.name === 'wall between');
    expect(wall).toBeDefined();
    if (!wall) return;
    const house = displayed(wall.p, wall.n, wall.albedo, 1);
    const dim = displayed(wall.p, wall.n, wall.albedo, 0);
    expect(dim / house).toBeLessThan(0.6);
    // But not a blackout — the screen light needs something to sit against.
    expect(dim / house).toBeGreaterThan(0.15);
  });

  it('keeps the step riser lit while the film runs, so nobody trips', () => {
    const riser = SURFACES.find((s) => s.name === 'riser face');
    expect(riser).toBeDefined();
    if (!riser) return;
    expect(displayed(riser.p, riser.n, riser.albedo, 0)).toBeGreaterThan(100);
  });
});

/**
 * Cafe surfaces, sampled from the objects in `cafe.glb`.
 *
 * This is the check that actually corresponds to the reported bug. Before the cafe
 * fixtures existed, the only thing reaching these points was flat ambient plus
 * hemisphere — the nearest auditorium fixture is the exit glow at z 8.1, behind a
 * wall and 1.5 m short of the gate — so every one of them sat in the low teens.
 */
const CAFE_SURFACES: Array<{
  name: string;
  p: Vec3;
  n: Vec3;
  albedo: number;
}> = [
  // Floor under the pendant cluster and the tables.
  {
    name: 'cafe floor @ tables',
    p: [0, 0.45, 10.7],
    n: [0, 1, 0],
    albedo: 0.1,
  },
  // Just inside the doors, the first thing you see walking through.
  { name: 'cafe floor @ gate', p: [0, 0.45, 9.0], n: [0, 1, 0], albedo: 0.1 },
  // Counter top, where the popcorn is served.
  {
    name: 'counter top',
    p: [-1.65, 1.35, 12.5],
    n: [0, 1, 0],
    albedo: 0.18,
  },
  // Menu board face, which looks back toward the doors (-Z).
  {
    name: 'menu board',
    p: [2.4, 2.1, 14.17],
    n: [0, 0, -1],
    albedo: 0.18,
  },
  // Far wall of the shell, behind the back bar.
  { name: 'cafe back wall', p: [0, 1.6, 14.4], n: [0, 0, -1], albedo: 0.18 },
];

describe('cafe illumination', () => {
  /**
   * Anchors the bug as it actually was, which is NOT that every surface metered
   * black — ambient plus hemisphere put a 0.18-albedo wall at 105 of 255. It is
   * that the light was perfectly FLAT: with no fixture past the auditorium's back
   * wall, every point of a given albedo read the same value wherever it sat, so
   * the room had no pools, no falloff and no modelled form. Combined with
   * `cafe.glb` never being mounted at all, walking through the doors showed a
   * dark, featureless void.
   */
  it('reproduces the flat, unlit cafe that was reported', () => {
    const flat = AMBIENT.house + HEMI.house;
    const floor = Math.round(srgbEncode(aces((0.1 * flat) / Math.PI)) * 255);
    const wall = Math.round(srgbEncode(aces((0.18 * flat) / Math.PI)) * 255);

    // The floor really was dark; the walls were merely featureless.
    expect(floor).toBeLessThan(75);
    expect(wall).toBeLessThan(120);

    // The diagnostic property: position made no difference whatsoever.
    for (const s of CAFE_SURFACES) {
      const asIfUnlit = Math.round(
        srgbEncode(aces((s.albedo * flat) / Math.PI)) * 255,
      );
      expect(asIfUnlit, s.name).toBe(s.albedo === 0.1 ? floor : wall);
    }
  });

  it('now varies with position, so the room has modelled form', () => {
    const underPendants = displayed([0, 0.45, 10.7], [0, 1, 0], 0.1, 1);
    /*
      A far corner, chosen to be outside every fixture's cutoff — including the
      auditorium's exit glow, which at z 8.1 with a 4.5 m radius genuinely does
      reach through the gate wall into the doorway. None of the point lights in
      this rig cast shadows, so that leak is real in the renderer and not an
      artifact of this analytic model; the first version of this test compared
      against the doorway and failed because of it.
    */
    const farCorner = displayed([4.2, 0.45, 9.2], [0, 1, 0], 0.1, 1);
    expect(underPendants).toBeGreaterThan(farCorner);
  });

  it('lights the cafe floor enough to walk on', () => {
    for (const s of CAFE_SURFACES.filter((x) =>
      x.name.startsWith('cafe floor'),
    )) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeGreaterThan(60);
    }
  });

  it('makes the counter and the menu board readable', () => {
    for (const s of CAFE_SURFACES.filter(
      (x) => x.name === 'counter top' || x.name === 'menu board',
    )) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeGreaterThan(110);
    }
  });

  it('does not blow any cafe surface out to white', () => {
    for (const s of CAFE_SURFACES) {
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeLessThan(250);
    }
  });

  it('is brighter than it was before the fixtures were added', () => {
    const flat = AMBIENT.house + HEMI.house;
    for (const s of CAFE_SURFACES) {
      const before = Math.round(
        srgbEncode(aces((s.albedo * flat) / Math.PI)) * 255,
      );
      expect(displayed(s.p, s.n, s.albedo, 1), s.name).toBeGreaterThan(before);
    }
  });

  it('stays usable while the film runs, since the lobby does not go dark', () => {
    for (const s of CAFE_SURFACES) {
      expect(displayed(s.p, s.n, s.albedo, 0), s.name).toBeGreaterThan(40);
    }
  });
});
