/**
 * Where this player was standing and which way they were facing, remembered
 * across a 2D <-> 3D switch.
 *
 * `TheatreScene` is unmounted the whole time the view mode is `2d`, and with it
 * the `<Canvas>`, the Rapier world and the player's rigid body. Everything about
 * where you were is destroyed: the body is recreated at `spawnFor(userId)` and the
 * camera at the same point, facing the screen. So pressing `V` twice put you back
 * on the rear platform no matter where you had walked to — repeatedly, which is
 * the form of the bug people actually notice.
 *
 * ---- WHO OWNS THIS ----
 *
 * `WatchPartyVideoArea`, in a ref, handed down as a prop. The same component that
 * owns the seat claim (`use-seat-occupancy`), for the same reason: it is the
 * nearest thing above the 2D/3D switch, so "where I am in the room" has exactly
 * one lifetime and it is the party's, not the renderer's.
 *
 * This was a module-level singleton first. That also survives a mode switch —
 * the dynamic import stays in the registry — but it made the lifetime depend on
 * webpack's module identity rather than on a React tree anybody can read, and it
 * could not be asserted from a test that mounts the composition. A ref in the
 * owning component is the same guarantee with none of the doubt, and it needs no
 * room/user key: the ref dies with the party it belongs to.
 *
 * A seat needs no entry here. A claim already says which chair is yours and every
 * client agrees on it, so duplicating that into a second memory would create two
 * sources of truth for one fact. This is only for the case a claim cannot express:
 * standing somewhere specific.
 */

export interface Stance {
  /** Feet position, three.js metres — NOT the capsule centre. */
  x: number;
  y: number;
  z: number;
  /** Camera yaw in degrees, matching the pose wire format. */
  yaw: number;
}

/** What `WatchPartyVideoArea` holds and `TheatreScene` reads and writes. */
export type StanceRef = { current: Stance | null };
