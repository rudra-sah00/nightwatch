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
 * Letting the backend answer means the asset set can be rolled forward (v1 ->
 * v2) or moved to a different bucket while sessions are live, which matters for
 * a watch party where clients stay connected for hours.
 *
 * Expected response shape:
 * ```json
 * {
 *   "version": "v1",
 *   "baseUrl": "https://assets.nightwatch.in",
 *   "models":     { "room": "...", "cafe": "...", "chair": "...", "avatar": "..." },
 *   "animations": { "locomotion": "...", "seating": "...", "dance": { "hiphop": "..." } }
 * }
 * ```
 */
export async function getTheatreAssets(): Promise<TheatreAssetManifest> {
  return apiFetch<TheatreAssetManifest>('/api/theatre/assets');
}
