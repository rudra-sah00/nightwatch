/**
 * Theatre asset manifest, served by the backend at `/api/theatre/assets`.
 *
 * Nothing here is hardcoded on the client. The backend is the source of truth
 * for which bucket, which domain and which asset-set version a session uses.
 * Bucket configuration itself lives in `nightwatch-backend/infra/r2/`.
 */

export interface TheatreModelUrls {
  /** auditorium shell, coffered ceiling, screen trim, masking, 7.1 speakers, aisle stairs */
  room: string;
  /** cafe room, counter, popcorn + espresso machines, tables, seller, glazed gate */
  cafe: string;
  /** one recliner — instance per seat rather than loading eight copies */
  chair: string;
  /** rigged character */
  avatar: string;
}

export interface TheatreAnimationUrls {
  /**
   * True when Idle / Walk / Run are glTF animations inside `models.avatar`
   * rather than separate files. Read them from the avatar gltf in that case.
   */
  clipsEmbedded: boolean;
  /**
   * Separate locomotion bundle, if one is ever published. `null` means the
   * embedded clips are the only source.
   */
  locomotion: string | null;
  /** sitDown / sitIdle / standUp. `null` until those clips are authored. */
  seating: string | null;
  /** clip name -> url, lazy loaded so dances never block first paint */
  dance: Record<string, string>;
}

/** True once locomotion clips are available from any source. */
export function hasAnimations(m: TheatreAssetManifest): boolean {
  return m.animations.clipsEmbedded || m.animations.locomotion !== null;
}

export interface TheatreAssetManifest {
  /** asset-set version, e.g. 'v1'. Informational — never build paths from it. */
  version: string;
  /** origin the assets are served from. Informational, for preconnect hints. */
  baseUrl: string;
  models: TheatreModelUrls;
  animations: TheatreAnimationUrls;
}

/** Needed before the scene can render at all. */
export function criticalModels(m: TheatreAssetManifest): readonly string[] {
  return [m.models.room, m.models.chair];
}

/** Fetched after first paint — the cafe sits behind a closed door. */
export function deferredModels(m: TheatreAssetManifest): readonly string[] {
  return [m.models.cafe, m.models.avatar];
}
