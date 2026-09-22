import { describe, expect, it } from 'vitest';
import {
  CAFE_ENVIRONMENT_INTENSITY,
  CAFE_FINISHES,
  finishFor,
} from '@/features/watch-party/theatre/lib/cafe-materials';

/** Every object name in the published cafe.glb, read out of the asset. */
const CAFE_OBJECTS = [
  'Cafe_BackBar',
  'Cafe_CoffeeMachine',
  'Cafe_Counter',
  'Cafe_MenuBoard',
  'Cafe_Pendants',
  'Cafe_PopcornMachine',
  'Cafe_Seller',
  'Cafe_Shell',
  'Cafe_Stock',
  'Cafe_Tables',
];

describe('cafe finishes', () => {
  it('only names objects that exist in the asset', () => {
    for (const key of Object.keys(CAFE_FINISHES)) {
      expect(CAFE_OBJECTS, key).toContain(key);
    }
  });

  it('leaves the shell and the seller alone', () => {
    // Plaster and a person. Polishing either turns the room into a showroom.
    expect(CAFE_FINISHES.Cafe_Shell).toBeUndefined();
    expect(CAFE_FINISHES.Cafe_Seller).toBeUndefined();
  });

  it('keeps every value inside the physically sensible range', () => {
    for (const [name, f] of Object.entries(CAFE_FINISHES)) {
      expect(f.roughness, name).toBeGreaterThan(0);
      expect(f.roughness, name).toBeLessThanOrEqual(1);
      expect(f.metalness, name).toBeGreaterThanOrEqual(0);
      expect(f.metalness, name).toBeLessThanOrEqual(1);
    }
  });

  it('never drives metalness to a mirror on an untextured mesh', () => {
    // These meshes have no maps at all, so metalness 1 reads as a chrome ball
    // rather than as a surface.
    for (const [name, f] of Object.entries(CAFE_FINISHES)) {
      expect(f.metalness, name).toBeLessThanOrEqual(0.85);
    }
  });

  it('emits only from things that are actually light sources', () => {
    const emitting = Object.entries(CAFE_FINISHES)
      .filter(([, f]) => f.emissive)
      .map(([name]) => name)
      .sort();
    expect(emitting).toEqual([
      'Cafe_MenuBoard',
      'Cafe_Pendants',
      'Cafe_PopcornMachine',
    ]);
  });

  it('keeps emission below the level that clips to white under ACES', () => {
    for (const [name, f] of Object.entries(CAFE_FINISHES)) {
      if (!f.emissive) continue;
      expect(f.emissiveIntensity ?? 1, name).toBeLessThanOrEqual(2);
      expect(f.emissiveIntensity ?? 1, name).toBeGreaterThan(0);
    }
  });

  it('makes the pendant shades the brightest emitter, since they are the lamps', () => {
    const pendant = CAFE_FINISHES.Cafe_Pendants.emissiveIntensity ?? 0;
    for (const [name, f] of Object.entries(CAFE_FINISHES)) {
      if (!f.emissive || name === 'Cafe_Pendants') continue;
      expect(f.emissiveIntensity ?? 1, name).toBeLessThan(pendant);
    }
  });

  it('makes the machines glossier than the woodwork', () => {
    expect(CAFE_FINISHES.Cafe_CoffeeMachine.roughness).toBeLessThan(
      CAFE_FINISHES.Cafe_Tables.roughness,
    );
    expect(CAFE_FINISHES.Cafe_CoffeeMachine.metalness).toBeGreaterThan(
      CAFE_FINISHES.Cafe_Tables.metalness,
    );
  });

  it('leaves the stock matte — it is card and paper', () => {
    expect(CAFE_FINISHES.Cafe_Stock.roughness).toBeGreaterThan(0.6);
    expect(CAFE_FINISHES.Cafe_Stock.metalness).toBe(0);
  });
});

describe('finishFor', () => {
  it('matches an exact object name', () => {
    expect(finishFor(['Cafe_Counter'])?.name).toBe('Cafe_Counter');
  });

  it('matches a suffixed mesh, which is how exporters name split meshes', () => {
    expect(finishFor(['Cafe_Counter_1'])?.name).toBe('Cafe_Counter');
    expect(finishFor(['Cafe_Tables.001'])?.name).toBe('Cafe_Tables');
  });

  it('walks up to the nearest named ancestor', () => {
    // An unnamed mesh inside Cafe_CoffeeMachine: the mesh contributes nothing, the
    // parent decides. This is the common case in the asset.
    expect(finishFor(['', 'Cafe_CoffeeMachine', 'Scene'])?.name).toBe(
      'Cafe_CoffeeMachine',
    );
  });

  it('prefers the nearest ancestor when two in the chain are listed', () => {
    expect(finishFor(['Cafe_Stock', 'Cafe_BackBar'])?.name).toBe('Cafe_Stock');
  });

  it('returns null for anything unlisted, leaving the material as authored', () => {
    expect(finishFor(['Cafe_Shell'])).toBeNull();
    expect(finishFor(['Cafe_Seller'])).toBeNull();
    expect(finishFor(['Gate_Leaf_L', 'Scene'])).toBeNull();
    expect(finishFor([])).toBeNull();
  });
});

describe('environment intensity', () => {
  it('is strong enough for metals to reflect something', () => {
    // At 0 a metalness surface renders black: it has nothing to reflect.
    expect(CAFE_ENVIRONMENT_INTENSITY).toBeGreaterThan(0.1);
  });

  it('is weak enough not to flood the tuned light rig', () => {
    // Image-based lighting also contributes diffuse. At 1.0 it flattens every
    // pool of light the fixtures in lighting.ts make.
    expect(CAFE_ENVIRONMENT_INTENSITY).toBeLessThanOrEqual(0.5);
  });
});
