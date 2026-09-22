/**
 * Theatre asset manifest, served by the backend at `/api/theatre/assets`.
 *
 * This used to carry the room, the cafe and the chair as well. All three are now
 * generated in code (`lib/geometry`), so the manifest has one job left: telling the
 * client which rigged character models are published.
 *
 * The avatars stay remote because they cannot be generated. They are skinned
 * meshes with an armature and ten animation clips, and a capsule would be a
 * downgrade rather than a port. Everything else about the room — 2.3 MB of
 * `room.glb`, 311 KB of `chair.glb`, the cafe, the texture sets, the KTX2 pipeline
 * and the whole `v1 -> v2` versioning dance — is gone.
 *
 * Bucket configuration itself lives in `nightwatch-backend/infra/r2/`.
 */

export interface TheatreModelUrls {
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

/**
 * Every character model the manifest offers, newest field first.
 *
 * Collapses the optional `avatars` list and the mandatory single `avatar` into
 * one deduplicated list, so callers never have to branch on which the backend
 * happened to send.
 *
 * This is also now the complete download set: with the room generated there is no
 * critical-versus-deferred split left to make.
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
