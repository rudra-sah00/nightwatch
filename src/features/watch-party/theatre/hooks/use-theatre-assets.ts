'use client';

import { useQuery } from '@tanstack/react-query';
import { getTheatreAssets } from '../api';
import { useTheatreView } from '../lib/view-mode';
import type { TheatreAssetManifest } from '../types';

export const THEATRE_ASSETS_KEY = ['theatre', 'assets'] as const;

/**
 * Load the backend-owned asset manifest.
 *
 * Gated on the 3D opt-in, because this hook runs from `useTheatrePreload()`,
 * which `ActiveWatchParty` mounts for every participant. Without the gate the
 * manifest was requested the moment anyone entered a party, whether or not they
 * ever opened 3D — which contradicts the rule the preloader is built around:
 * nobody pays for the room unless they asked for the room.
 *
 * It also made a backend authorization bug visible to every anonymous guest.
 * `/api/theatre/assets` was mounted `restrictTo('user')`, so an approved guest
 * authenticated and was then refused 403 FORBIDDEN, and each of them ate the
 * failure plus two retries on entry while never having asked for 3D. The route
 * now admits guests, but the request still has no business firing before opt-in.
 *
 * `enabled` is safe as the gate for the consumer inside the Canvas too:
 * `TheatreScene` only mounts once the view mode has left `2d`, which `setMode`
 * and `cycle` both refuse until assets are ready — so by then this query has
 * long since resolved and it reads the cached manifest.
 *
 * Long `staleTime` because a manifest only changes when a new asset set is
 * published, and re-fetching mid-session would risk swapping URLs under a
 * loaded scene.
 *
 * @param options.enabled - Force the fetch on regardless of the 3D opt-in. The
 *   settings panel passes this: it has to quote the download size *before* the
 *   user commits, and the size lives in the manifest. That does not reopen the
 *   problem the gate exists for — the gate stops the request firing for every
 *   participant the moment a party mounts, whereas opening the settings panel is
 *   a deliberate action by one person, and the manifest is a tiny edge-cached
 *   JSON rather than the multi-megabyte models. Same query key, so the panel
 *   warms the cache the preloader then reuses.
 */
export function useTheatreAssets(options?: { enabled?: boolean }) {
  const optedIn = useTheatreView((s) => s.enabled);

  return useQuery<TheatreAssetManifest>({
    queryKey: THEATRE_ASSETS_KEY,
    queryFn: getTheatreAssets,
    enabled: options?.enabled || optedIn,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
