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
  /**
   * Rigged character. Always present, and used when `avatars` is absent or
   * empty, so a manifest that predates character variety still works.
   */
  avatar: string;
  /**
   * Additional rigged characters, when more than one is published.
   *
   * Each entry must carry the same clip names (`Idle`, `Walk`, `SitDown`,
   * `SitIdle`, `StandUp`, `Dance.*`) because `clipNameFor` looks them up by name
   * and the animation state machine is shared across every character. A peer is
   * assigned one deterministically from their user id — see `avatarUrlFor` —
   * so the same person is the same character on every client.
   */
  avatars?: readonly string[];
}

export interface TheatreAnimationUrls {
  /**
   * True when Idle / Walk / SitDown etc. are glTF animations inside
   * `models.avatar` rather than separate files. Read them from the avatar gltf
   * in that case.
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
  return [m.models.cafe, ...avatarModels(m)];
}

/**
 * Every character model the manifest offers, newest field first.
 *
 * Collapses the optional `avatars` list and the mandatory single `avatar` into
 * one deduplicated list, so callers never have to branch on which the backend
 * happened to send.
 */
export function avatarModels(m: TheatreAssetManifest): readonly string[] {
  const list = m.models.avatars?.length ? m.models.avatars : [m.models.avatar];
  return [
    ...new Set(list.filter((u) => typeof u === 'string' && u.length > 0)),
  ];
}

/**
 * The model URL for a specific character body.
 *
 * Every published model is downloaded regardless (a peer may have chosen either
 * body, and we cannot draw them without it). This only decides WHICH of the
 * loaded models a given avatar is drawn with, from the character that peer
 * broadcast.
 *
 * Matching is on the filename so the backend stays free to move or rename the
 * prefix. Returns null when nothing is published, and falls back to the first
 * model on an unrecognised set — showing the wrong body beats showing none.
 */
export function avatarModelForCharacter(
  m: TheatreAssetManifest,
  character: 'man' | 'woman',
): string | null {
  const all = avatarModels(m);
  if (all.length === 0) return null;
  if (all.length === 1) return all[0];
  const want = character === 'woman' ? 'girl' : 'boy';
  const match = all.find((url) => {
    const file = url.split('/').pop()?.toLowerCase() ?? '';
    return file.includes(want);
  });
  return match ?? all[0];
}
