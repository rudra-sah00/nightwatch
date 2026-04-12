import type { Episode, ShowDetails } from '@/features/search/types';

// Storage key for caching series data
const SERIES_CACHE_KEY = 'watch_series_cache';

interface CachedSeriesData {
  seriesId: string;
  showDetails: ShowDetails;
  loadedSeasons: Record<number, Episode[]>; // seasonNumber -> episodes
  timestamp: number;
  expiryMs: number; // Dynamic expiry based on episode length
}

// Minimum cache duration: 2 hours
const MIN_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;
// Buffer time to add to episode duration: 30 minutes
const CACHE_BUFFER_MS = 30 * 60 * 1000;

/**
 * Calculate smart cache expiry based on episode duration
 * Uses episode duration + 30min buffer, with 2 hour minimum
 */
function calculateCacheExpiry(episodeDurationSeconds?: number): number {
  if (!episodeDurationSeconds || episodeDurationSeconds <= 0) {
    return MIN_CACHE_EXPIRY_MS;
  }

  // Convert to ms and add buffer
  const durationBasedExpiry = episodeDurationSeconds * 1000 + CACHE_BUFFER_MS;

  // Return the larger of duration-based or minimum expiry
  return Math.max(durationBasedExpiry, MIN_CACHE_EXPIRY_MS);
}

/**
 * Get cached series data from sessionStorage
 */
export function getCachedSeriesData(seriesId: string): CachedSeriesData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(SERIES_CACHE_KEY);
    if (!cached) return null;

    const data: CachedSeriesData = JSON.parse(cached);

    // Check if it's for the same series and not expired
    const expiryMs = data.expiryMs || MIN_CACHE_EXPIRY_MS;
    if (data.seriesId === seriesId && Date.now() - data.timestamp < expiryMs) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cache series data to sessionStorage (called from content modal when playing)
 * @param episodeDurationSeconds - Current episode duration for smart cache expiry
 */
export function cacheSeriesData(
  seriesId: string,
  showDetails: ShowDetails,
  currentSeasonNumber: number,
  currentSeasonEpisodes: Episode[],
  episodeDurationSeconds?: number,
): void {
  if (typeof window === 'undefined') return;

  try {
    const existingCache = getCachedSeriesData(seriesId);

    // Calculate smart expiry based on episode duration
    const newExpiry = calculateCacheExpiry(episodeDurationSeconds);
    // Keep the longer expiry if existing cache has more time
    const expiryMs = existingCache
      ? Math.max(existingCache.expiryMs, newExpiry)
      : newExpiry;

    const cacheData: CachedSeriesData = {
      seriesId,
      showDetails,
      loadedSeasons: existingCache?.loadedSeasons || {},
      timestamp: Date.now(),
      expiryMs,
    };

    // Add/update the current season's episodes
    cacheData.loadedSeasons[currentSeasonNumber] = currentSeasonEpisodes;

    sessionStorage.setItem(SERIES_CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Storage quota exceeded or other error - ignore
  }
}

/**
 * Clear series cache
 */
export function clearSeriesCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SERIES_CACHE_KEY);
}

// Export types for use in other files
