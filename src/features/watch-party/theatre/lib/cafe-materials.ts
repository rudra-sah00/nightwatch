/**
 * Cafe surface finishes.
 *
 * WHY THIS FILE EXISTS
 *
 * `cafe.glb` carries 23 materials and **zero textures** — every surface is a flat
 * colour. That is why the room reads as cardboard even once it is lit: flat albedo
 * with default roughness has no specular response, so nothing catches a highlight
 * from the pendants or the servery light. A chrome espresso machine and a painted
 * wall shade identically.
 *
 * Rather than author textures (which would mean a new asset publish and another
 * ~10 MB of download), the finishes are set per object here. `cafe.glb` names its
 * objects, so each one can be given the roughness, metalness and emission it should
 * have had. This is the same trick the auditorium already uses for its LED strips:
 * cheap material properties standing in for modelled detail.
 *
 * METALNESS NEEDS AN ENVIRONMENT
 *
 * A metal in three.js is lit almost entirely by what it reflects. With no
 * environment map a `metalness: 1` surface renders nearly BLACK, which is the
 * opposite of shiny — so `TheatreCafe` installs a procedural environment before
 * these are applied. Raising metalness without one makes things worse, not better.
 *
 * Values are deliberately conservative. `metalness: 1` on an untextured mesh looks
 * like a mirror ball; real brushed steel in a cafe sits nearer 0.8 with enough
 * roughness to blur the reflection into a sheen.
 */

/** A finish applied to one named object from `cafe.glb`. */
export interface CafeFinish {
  /** 0 = mirror, 1 = fully diffuse. */
  roughness: number;
  /** 0 = dielectric, 1 = metal. Needs a scene environment to read as metal. */
  metalness: number;
  /**
   * Emissive tint, sRGB hex. Only for surfaces that are genuinely light sources —
   * lamp shades and a backlit board. Emission in three.js lights nothing but
   * itself, so these pair with the real fixtures in `lighting.ts`.
   */
  emissive?: string;
  /** Emissive strength. Above ~2 the surface clips to white under ACES. */
  emissiveIntensity?: number;
}

/**
 * Object name -> finish.
 *
 * Names verified against the published asset, not guessed: `Cafe_BackBar`,
 * `Cafe_CoffeeMachine`, `Cafe_Counter`, `Cafe_MenuBoard`, `Cafe_Pendants`,
 * `Cafe_PopcornMachine`, `Cafe_Seller`, `Cafe_Shell`, `Cafe_Stock`, `Cafe_Tables`.
 *
 * `Cafe_Shell` and `Cafe_Seller` are deliberately absent. The shell is plaster and
 * painted board, which should stay matte or the whole room turns into a showroom,
 * and a person is not a polished surface.
 */
export const CAFE_FINISHES: Readonly<Record<string, CafeFinish>> = {
  /** Polished stone servery top — the main highlight-catcher in the room. */
  Cafe_Counter: { roughness: 0.22, metalness: 0.3 },
  /** Bottle shelving and back counter, a shade duller than the front. */
  Cafe_BackBar: { roughness: 0.3, metalness: 0.25 },
  /** Brushed steel, the shiniest things in the cafe. */
  Cafe_CoffeeMachine: { roughness: 0.18, metalness: 0.8 },
  /** Warm-lit glass box, so it gets both a sheen and its own glow. */
  Cafe_PopcornMachine: {
    roughness: 0.2,
    metalness: 0.6,
    emissive: '#ffb347',
    emissiveIntensity: 0.55,
  },
  /** Varnished tops. Gloss, but not metal. */
  Cafe_Tables: { roughness: 0.28, metalness: 0.05 },
  /** Cups and boxes on the shelf — matte, they are card and paper. */
  Cafe_Stock: { roughness: 0.75, metalness: 0 },
  /**
   * The hanging lamps. These sit directly beneath the two pendant point lights, so
   * making the shades emissive is what connects the fixture you can see to the
   * light you can see it cast.
   */
  Cafe_Pendants: {
    roughness: 0.35,
    metalness: 0.45,
    emissive: '#ffdaab',
    emissiveIntensity: 1.5,
  },
  /** Backlit menu, the way a real one is. Readable without being a lamp. */
  Cafe_MenuBoard: {
    roughness: 0.4,
    metalness: 0.1,
    emissive: '#fff4e0',
    emissiveIntensity: 0.7,
  },
};

/**
 * The finish for an object, walking up its ancestors.
 *
 * Meshes inside a named object are often called things like `Cafe_Counter_1` or are
 * unnamed children of it, so an exact-match lookup on the mesh itself would miss
 * most of the room. Returns null when nothing in the chain is listed, which leaves
 * the material exactly as authored.
 */
export function finishFor(
  names: readonly string[],
): { name: string; finish: CafeFinish } | null {
  for (const name of names) {
    const exact = CAFE_FINISHES[name];
    if (exact) return { name, finish: exact };
    // `Cafe_Counter_1`, `Cafe_Counter.001` — the prefix is the object.
    for (const key of Object.keys(CAFE_FINISHES)) {
      if (name.startsWith(key))
        return { name: key, finish: CAFE_FINISHES[key] };
    }
  }
  return null;
}

/**
 * Specular strength of the procedural environment.
 *
 * Low on purpose. The environment exists to give metals something to reflect, not
 * to light the room — the rig in `lighting.ts` does that, and its values were tuned
 * by eye against these albedos. At 1.0 the image-based lighting floods the cafe and
 * flattens every pool of light the fixtures make.
 */
export const CAFE_ENVIRONMENT_INTENSITY = 0.35;
