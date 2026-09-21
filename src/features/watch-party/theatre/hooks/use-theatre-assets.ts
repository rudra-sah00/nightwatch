'use client';

import { useQuery } from '@tanstack/react-query';
import { getTheatreAssets } from '../api';
import type { TheatreAssetManifest } from '../types';

export const THEATRE_ASSETS_KEY = ['theatre', 'assets'] as const;

/**
 * Load the backend-owned asset manifest.
 *
 * Long `staleTime` because a manifest only changes when a new asset set is
 * published, and re-fetching mid-session would risk swapping URLs under a
 * loaded scene.
 */
export function useTheatreAssets() {
  return useQuery<TheatreAssetManifest>({
    queryKey: THEATRE_ASSETS_KEY,
    queryFn: getTheatreAssets,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
