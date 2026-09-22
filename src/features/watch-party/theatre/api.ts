import { apiFetch } from '@/lib/fetch';
import type { TheatreAssetManifest } from './types';

export type { TheatreAssetManifest } from './types';

/**
 * Fetch the theatre asset manifest.
 *
 * URLs are owned by the backend, not the client — same as `getGameUrl`. The
 * client must never construct R2 paths itself, because then the bucket, the
 * custom domain and the asset-set version are all baked into a deployed bundle
 * and cannot be changed without a frontend release.
 *
 * Since the room, chair and cafe became generated geometry, the only assets left
 * are the rigged characters: they are skinned meshes with an armature and ten
 * clips, which is the one thing in this feature that cannot be produced in code.
 *
 * Expected response shape:
 * ```json
 * {
 *   "version": "v1",
 *   "baseUrl": "https://assets.nightwatch.in",
 *   "models":     { "avatar": "...", "avatars": ["...", "..."] },
 *   "animations": { "clipsEmbedded": true, "locomotion": null, "seating": null, "dance": {} }
 * }
 * ```
 *
 * `models.room`, `models.cafe` and `models.chair` are ignored if the backend
 * still sends them, so the frontend can ship ahead of the manifest being trimmed.
 */
export async function getTheatreAssets(): Promise<TheatreAssetManifest> {
  return apiFetch<TheatreAssetManifest>('/api/theatre/assets');
}
