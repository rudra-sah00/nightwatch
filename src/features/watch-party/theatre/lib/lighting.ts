/**
 * Auditorium light rig — the numbers, kept separate from the JSX that mounts them.
 *
 * WHY THIS FILE EXISTS
 *
 * The Blender scene lights itself with 52 fixtures. **None of them reach the
 * browser.** glTF only carries lights via `KHR_lights_punctual`, the export
 * deliberately omits lights (docs/features/THEATRE_3D.md §3), and that extension
 * cannot express an area light at all — 34 of the 52 are `AREA`. Verified against
 * the published asset: `room.glb` on R2 lists
 * `extensionsUsed: [EXT_mesh_gpu_instancing, EXT_texture_webp,
 * KHR_draco_mesh_compression, KHR_materials_emissive_strength,
 * KHR_materials_sheen, KHR_texture_transform]` — no `KHR_lights_punctual`.
 *
 * The second half of the trap is that the room *looks* lit in the .blend for a
 * reason three.js cannot reproduce: the coffer LEDs, cove strips and aisle
 * strips are **emissive materials**, and EEVEE/Cycles bounce that emission onto
 * the walls. three.js has no global illumination, so an emissive material glows
 * on its own surface and lights nothing. Every LED in this room is decoration
 * until a real light is placed next to it.
 *
 * So this rig is a hand-built stand-in for the Blender fixtures, not an export
 * of them. Positions ARE taken from the Blender lights (converted
 * `three.y = blender.z`, `three.z = -blender.y`), so the pools of light land
 * where the modelled fixtures are. Intensities are NOT converted — see below.
 *
 * ON INTENSITY UNITS
 *
 * Blender's light "Power" is radiometric watts fed through Cycles' own
 * conversion; three.js wants candela for point/spot and lux for directional.
 * The usual `W → lm → cd` chain (`P * 683 / 4π`) turns a 14 W sconce into
 * ~760 cd, which at 0.35 m from a wall is ~6000 lux — nothing like the .blend.
 * Chasing photometric parity with Cycles is a losing game, so these values were
 * tuned by eye against the room's albedos and are documented as tuned.
 *
 * Why the old rig rendered black, numerically: ambient was 0.22, and
 * `NEO_Wall`'s glTF `baseColorFactor` is 0.195 linear. Ambient contributes
 * `albedo * intensity / π`, so the walls sat at 0.195 * 0.22 / π ≈ **0.014** —
 * about 1% grey. The geometry was always there; there was nothing to see it by.
 *
 * TWO MODES
 *
 * `house` is walking-around light: every fixture up, the room legible.
 * `dimmed` is what a real auditorium does when the film starts — fixtures drop
 * to a fraction so the screen becomes the dominant source. Seated and
 * screen-focus views use it. The transition is a lerp, not a cut, because a
 * hard step reads as a bug rather than as house lights going down.
 */

/** A fixture's two levels. `house` = lights up, `dim` = film running. */
export interface LightLevel {
  house: number;
  dim: number;
}

/** A positioned point fixture. */
export interface PointFixture {
  /** Stable key for React and for tests. */
  id: string;
  /** three.js space, metres. */
  position: readonly [number, number, number];
  colour: string;
  level: LightLevel;
  /** Cutoff radius. Bounds the fragment cost as much as it shapes the falloff. */
  distance: number;
}

/**
 * Warm tungsten, matching Blender's linear `(1.0, 0.70, 0.40)`.
 *
 * Written as sRGB hex because `Color.set('#…')` decodes sRGB → linear, whereas
 * `setRGB` would take the numbers as already-linear. Encoding 0.70 and 0.40
 * gives 0xda and 0xab.
 */
const WARM = '#ffdaab';
/** Blender's linear `(1.0, 0.72, 0.42)` — the slightly paler wash fixtures. */
const WARM_PALE = '#ffdcae';
/** Exit sign green, Blender linear `(0.18, 1.0, 0.40)`. */
const EXIT_GREEN = '#73ffab';
/** Cool bounce for the shadow key, as the old rig had it. */
const KEY_COLOUR = '#aab6d4';

/** Flat floor of visibility. The one knob to raise if the room reads too dark. */
export const AMBIENT: LightLevel = { house: 1.1, dim: 0.3 };
/** Warm bounce off carpet and seat fabric. */
export const AMBIENT_COLOUR = '#3a3026';

/** Top-down gradient so the ceiling is not the same value as the floor. */
export const HEMI: LightLevel = { house: 1.0, dim: 0.26 };
export const HEMI_SKY = '#2a3550';
export const HEMI_GROUND = '#1a1410';

/**
 * The only shadow-casting light, by design.
 *
 * `RectAreaLight` cannot cast shadows in three.js and point lights need a
 * cubemap (six passes), so contact shadows under avatars have to come from a
 * directional. THEATRE_3D.md §8 caps shadowed lights at two; one is enough.
 */
export const KEY: LightLevel = { house: 1.05, dim: 0.34 };
export { KEY_COLOUR };

/**
 * Side-wall sconces. Blender has eight (`SconceLight_L0..3` / `R0..3`) at
 * `|x| = 3.65`, `y = 2.2`, `z ∈ {1.7, 3.6, 5.5, 7.4}`.
 *
 * Four are mounted here rather than eight. Every extra point light is a fixed
 * per-fragment cost in a forward renderer, and the pools at 1.9 m spacing
 * overlap enough that dropping every other one is invisible once `distance`
 * is widened. The kept positions are the midpoints of the pairs.
 *
 * Intensity is deliberately modest, and the lights are mounted well off the
 * wall — 0.85 m in, not at the 3.65 m the modelled sconce bodies sit at. A point
 * light 0.35 m from plaster is a blowout: inverse-square metered the wall at 251
 * of 255 right beside the fixture, which erases the walnut grain the texture
 * exists to show and barely dimmed when the house lights went down. Pulling the
 * light inboard broadens the pool into something that reads as a wall wash and
 * keeps the peak near 200.
 */
export const SCONCES: readonly PointFixture[] = [
  {
    id: 'sconce-L-front',
    position: [-3.15, 2.2, 2.65],
    colour: WARM,
    level: { house: 8, dim: 2.0 },
    distance: 8,
  },
  {
    id: 'sconce-L-rear',
    position: [-3.15, 2.2, 6.45],
    colour: WARM,
    level: { house: 8, dim: 2.0 },
    distance: 8,
  },
  {
    id: 'sconce-R-front',
    position: [3.15, 2.2, 2.65],
    colour: WARM,
    level: { house: 8, dim: 2.0 },
    distance: 8,
  },
  {
    id: 'sconce-R-rear',
    position: [3.15, 2.2, 6.45],
    colour: WARM,
    level: { house: 8, dim: 2.0 },
    distance: 8,
  },
];

/**
 * Ceiling downlights, standing in for Blender's 16 `CeilingSpot_*` (7 W each,
 * `y = 4.52`) plus the `Wash_0..2` overheads.
 *
 * Point lights, not spots: a spot's cone is barely legible against a coffered
 * ceiling at this intensity, and `SpotLight` costs more. Placed on the coffer
 * rib lines at `|x| = 1.87` so the pools line up with the modelled geometry.
 *
 * These carry most of the "walking" look, so they have the widest house/dim
 * ratio in the rig — they are the fixtures an audience expects to go out.
 *
 * They are also the strongest fixtures by a wide margin, because they are the
 * only ones that reach the floor: hung at 4.2 m over a carpet whose base colour
 * is 0.021 linear, almost everything they emit is absorbed. The sconces and
 * coves do nothing for the floor at all.
 */
export const CEILING: readonly PointFixture[] = [
  {
    id: 'ceiling-L-front',
    position: [-1.87, 4.2, 1.9],
    colour: WARM,
    level: { house: 34, dim: 4.5 },
    distance: 12,
  },
  {
    id: 'ceiling-R-front',
    position: [1.87, 4.2, 1.9],
    colour: WARM,
    level: { house: 34, dim: 4.5 },
    distance: 12,
  },
  {
    id: 'ceiling-L-rear',
    position: [-1.87, 4.2, 6.3],
    colour: WARM,
    level: { house: 34, dim: 4.5 },
    distance: 12,
  },
  {
    id: 'ceiling-R-rear',
    position: [1.87, 4.2, 6.3],
    colour: WARM,
    level: { house: 34, dim: 4.5 },
    distance: 12,
  },
];

/**
 * Fixtures that stay on during the film.
 *
 * A real auditorium keeps step and aisle lighting lit precisely so people can
 * move without falling, so these barely dim at all. The step light marks the
 * 0.45 m riser at `z = 5.3`, which is the one place in the room you can trip.
 * It is mounted on the LOWER floor in front of the riser, because the riser's
 * exposed face looks toward the screen (`-Z`) — the rear platform behind it
 * would light the wrong side. It also sits 0.45 m clear of that face rather than
 * the 0.1 m of Blender's `StepAccent`, which at this intensity metered the riser
 * at 252 of 255 and did not visibly dim at all.
 *
 * The exit glow is the green wall niche on the back wall (`BW_ExitGlow`).
 */
export const ACCENTS: readonly PointFixture[] = [
  {
    id: 'step-accent',
    position: [0, 0.5, 4.85],
    colour: WARM_PALE,
    level: { house: 2.6, dim: 1.9 },
    distance: 5,
  },
  {
    id: 'exit-glow',
    position: [0, 2.3, 8.1],
    colour: EXIT_GREEN,
    level: { house: 3.2, dim: 2.4 },
    distance: 4.5,
  },
];

/**
 * Cove wash, from Blender's `CoveLight_L` / `CoveLight_R` (AREA, 7.9 × 0.5 m,
 * `y = 4.32`, 34 W) — the fixtures that uplight the side walls and sell the
 * room's height.
 *
 * Kept as rect area lights because a point light cannot produce a long soft
 * band, and the LTC tables are loaded for the screen light anyway so the shader
 * cost is already paid. They light `MeshStandardMaterial` only, which is what
 * the glTF loader produces, so the room responds to them and nothing else needs
 * to.
 */
export interface RectFixture {
  id: string;
  position: readonly [number, number, number];
  /** Euler radians. Coves aim inward and up at the ceiling. */
  rotation: readonly [number, number, number];
  width: number;
  height: number;
  colour: string;
  level: LightLevel;
}

export const COVES: readonly RectFixture[] = [
  {
    id: 'cove-L',
    position: [-3.8, 4.25, 4.25],
    // Long axis down the room, tilted to throw across the ceiling
    rotation: [0, Math.PI / 2, -Math.PI / 2.6],
    width: 7.9,
    height: 0.5,
    colour: WARM,
    level: { house: 3.4, dim: 0.85 },
  },
  {
    id: 'cove-R',
    position: [3.8, 4.25, 4.25],
    rotation: [0, -Math.PI / 2, Math.PI / 2.6],
    width: 7.9,
    height: 0.5,
    colour: WARM,
    level: { house: 3.4, dim: 0.85 },
  },
];

/**
 * Seconds for a full house-to-dim transition.
 *
 * Deliberately slow. Cinema house lights take a few seconds, and an instant
 * change while sitting down reads as a rendering glitch rather than as an event.
 */
export const DIM_FADE_SECONDS = 1.6;

/** `1` = house lights up, `0` = dimmed for the film. */
export type LightingLevel = number;

/**
 * Target level for a view state.
 *
 * Walking gets house lights. Sitting down dims them, and so does screen-focus
 * mode — in both the user has committed to watching, and the screen should be
 * the brightest thing in the frame.
 */
export function targetLevel(opts: {
  seated: boolean;
  cinema: boolean;
}): LightingLevel {
  return opts.seated || opts.cinema ? 0 : 1;
}

/** Interpolate a fixture between its dim and house values. */
export function levelValue(level: LightLevel, t: LightingLevel): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return level.dim + (level.house - level.dim) * clamped;
}

/**
 * Exponential smoothing step, framerate independent.
 *
 * `1 - exp(-k·dt)` rather than a fixed per-frame fraction: the latter converges
 * at a different speed on a 144 Hz monitor than on a 60 Hz one, which would make
 * the fade length depend on the user's hardware.
 */
export function approach(
  current: LightingLevel,
  target: LightingLevel,
  deltaSeconds: number,
  seconds: number = DIM_FADE_SECONDS,
): LightingLevel {
  if (seconds <= 0) return target;
  // 5 time constants ≈ 99% of the way there, so `seconds` is the perceived
  // duration rather than a 63% half-life.
  const k = 5 / seconds;
  const step = 1 - Math.exp(-k * Math.max(deltaSeconds, 0));
  return current + (target - current) * step;
}

/** Every point fixture in the rig, in mount order. */
export const POINT_FIXTURES: readonly PointFixture[] = [
  ...CEILING,
  ...SCONCES,
  ...ACCENTS,
];
