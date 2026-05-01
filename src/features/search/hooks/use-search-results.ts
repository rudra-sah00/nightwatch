'use client';

import React from 'react';
import type { SearchResult } from '../types';

/**
 * Hook that deduplicates an array of search results by their `id` field.
 *
 * @param results - Raw search results (may contain duplicates from
 *                  different API sources).
 * @returns An object containing the deduplicated `uniqueResults` array.
 */
export function useSearchResults(results: SearchResult[]) {
  const uniqueResults = React.useMemo(() => {
    const seen = new Set<string>();
    return results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [results]);

  return { uniqueResults };
}

/**
 * Minimal hook that tracks the image-error state for a single search
 * result card.
 *
 * @returns `imageError` flag and its setter.
 */
export function useSearchResultItem() {
  const [imageError, setImageError] = React.useState(false);
  return { imageError, setImageError };
}
