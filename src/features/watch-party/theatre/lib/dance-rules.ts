/**
 * Rules for when and how you may dance.
 *
 * Two separate concerns live here, both kept pure so they can be reasoned about
 * and tested without a physics world or a browser: how much room a dance needs,
 * and which wedge of the radial picker the cursor is in.
 */

/**
 * Clear radius a dance requires, metres, measured from the dancer.
 *
 * Derived from the clips rather than guessed. The three in-place dances swing the
 * hips up to 0.29 m off centre (measured on the source animation), and an adult's
 * arm span adds roughly 0.8 m of reach at full extension. 0.9 m keeps flailing
 * limbs out of the chairs and walls without demanding an implausible amount of
 * space in a room whose seat pitch is only 0.90 m.
 */
export const DANCE_CLEARANCE_M = 0.9;

/**
 * Height above the floor at which clearance is probed.
 *
 * Deliberately not at the feet. A ground-level probe hits the floor itself and
 * would report zero clearance everywhere. Torso height also matches where the
 * dance actually occupies space — the arms and shoulders, not the shoes.
 */
export const DANCE_PROBE_HEIGHT_M = 1.0;

/** Directions probed around the dancer. Eight is enough to catch a chair arm. */
export const DANCE_PROBE_DIRECTIONS = 8;

/**
 * True when every probed direction is clear enough to dance.
 *
 * Takes the measured distances so the decision is testable without Rapier.
 * A direction that hit nothing is `Infinity`, which passes.
 */
export function hasDanceSpace(
  distances: readonly number[],
  clearance: number = DANCE_CLEARANCE_M,
): boolean {
  if (distances.length === 0) return false;
  return distances.every((d) => d >= clearance);
}

/** The tightest measured direction, for telling the user which way to move. */
export function tightestClearance(distances: readonly number[]): number {
  if (distances.length === 0) return 0;
  return distances.reduce(
    (min, d) => (d < min ? d : min),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * Cursor travel, in pixels, before the radial picker commits to a wedge.
 *
 * Releasing the key without moving must cancel, not pick whatever happens to be
 * under the centre. A dead zone is what separates "I changed my mind" from "I
 * chose the option at the top".
 */
export const WHEEL_DEAD_ZONE_PX = 28;

/**
 * Which wedge the cursor is in, or null inside the dead zone.
 *
 * The first option sits at the top and they run clockwise, because that is what
 * a radial menu looks like to everyone who has used one. Screen Y grows
 * downward, hence the negated dy.
 */
export function wheelSelection(
  dx: number,
  dy: number,
  count: number,
  deadZone: number = WHEEL_DEAD_ZONE_PX,
): number | null {
  if (count <= 0) return null;
  if (Math.hypot(dx, dy) < deadZone) return null;
  // atan2(dx, -dy): 0 at straight up, increasing clockwise.
  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += Math.PI * 2;
  const wedge = (Math.PI * 2) / count;
  // Offset by half a wedge so each option is CENTRED on its direction rather
  // than starting at it.
  const index = Math.floor((angle + wedge / 2) / wedge) % count;
  return index;
}

/** Screen-space centre direction of a wedge, for laying the labels out. */
export function wheelOptionAngle(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index / count) * Math.PI * 2;
}
