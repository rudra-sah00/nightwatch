import { describe, expect, it } from 'vitest';
import { ROOM } from '@/features/watch-party/theatre/lib/layout';
import {
  AMBIENT,
  approach,
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

  it('places every fixture inside the room', () => {
    for (const f of [...POINT_FIXTURES, ...COVES]) {
      const [x, y, z] = f.position;
      expect(Math.abs(x), f.id).toBeLessThanOrEqual(ROOM.maxX + 0.5);
      expect(y, f.id).toBeGreaterThan(ROOM.floorY);
      expect(y, f.id).toBeLessThanOrEqual(ROOM.wallTopY);
      expect(z, f.id).toBeGreaterThanOrEqual(ROOM.minZ);
      expect(z, f.id).toBeLessThanOrEqual(ROOM.maxZ);
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
    // Back down to 12 from 16 now the cafe and its four fixtures are gone.
    // Every point light is a fixed per-fragment cost in a forward renderer
    // whether or not it can reach the surface being shaded, so a wall does not
    // make its light free. This is the cheapest lever in the whole rig: the
    // cost curve is superlinear past roughly 16 punctual lights, where each
    // extra one costs about twice the previous.
    expect(POINT_FIXTURES.length + COVES.length).toBeLessThanOrEqual(12);
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
    p: [ROOM.minX + 0.5, 0, 8.2],
    n: [0, 1, 0],
    albedo: CARPET_ALBEDO,
  },
  {
    name: 'wall at sconce',
    p: [ROOM.minX, 2.2, 2.65],
    n: [1, 0, 0],
    albedo: WALL_ALBEDO,
  },
  {
    name: 'wall between',
    p: [ROOM.minX, 1.5, 4.5],
    n: [1, 0, 0],
    albedo: WALL_ALBEDO,
  },
  {
    name: 'wall high',
    p: [ROOM.minX, 3.2, 4.5],
    n: [1, 0, 0],
    albedo: WALL_ALBEDO,
  },
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
