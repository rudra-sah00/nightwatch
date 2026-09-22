/**
 * Code-generated theatre geometry.
 *
 * The auditorium, its chairs and its starfield are built from primitives at
 * runtime rather than loaded as glTF. This replaced `room.glb` (2.3 MB),
 * `chair.glb` (311 KB) and `cafe.glb` outright — there is no room asset to
 * download, no texture set, no export pipeline and no version to roll forward.
 *
 * `layout.ts` remains the single source of truth for every dimension; nothing in
 * here may hardcode a figure that exists there.
 */

export {
  AUDITORIUM_METRICS,
  buildAuditorium,
  REAR_DETAIL_FACE_Z,
} from './auditorium';
export {
  type CylinderAxis,
  disposeBuilt,
  GeometryBatcher,
  type Rotation,
} from './batch';
export {
  disposeTheatreMaterials,
  type TheatreMaterials,
  theatreMaterials,
} from './materials';
export {
  buildRecliner,
  buildSeating,
  CHAIR_BACK,
  CHAIR_FRONT,
  CHAIR_HALF_WIDTH,
  CHAIR_HEIGHT,
  CHAIR_SEAT_TOP,
} from './recliner';
export {
  buildStarfield,
  disposeStarfield,
  type StarTier,
  updateStarfield,
} from './starfield';
