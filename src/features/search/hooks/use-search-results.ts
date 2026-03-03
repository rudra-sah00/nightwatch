'use client';

import React from 'react';
import type { SearchResult } from '../types';

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

export function useSearchResultItem() {
  const [imageError, setImageError] = React.useState(false);
  return { imageError, setImageError };
}
