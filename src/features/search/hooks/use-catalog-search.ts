'use client';

import { useQueries } from '@tanstack/react-query';
import React from 'react';
import { searchCatalogContent } from '@/features/search/api';
import type { SearchResult } from '@/features/search/types';
import { trackEvent } from '@/lib/analytics';
import { SEARCH_CATALOGS } from '../lib/catalogs';

/** One catalogue's slice of a search, and how far along it is. */
export interface CatalogSection {
  id: string;
  label: string;
  results: SearchResult[];
  /** True until this catalogue's own request settles, independent of the others. */
  isPending: boolean;
  /** This catalogue's upstream did not answer. The others are unaffected. */
  isError: boolean;
  retry: () => void;
}

interface UseCatalogSearchReturn {
  sections: CatalogSection[];
  /** Results found so far across every settled section. */
  totalCount: number;
  /** At least one catalogue is still in flight. */
  isAnyPending: boolean;
  /** Nothing is in flight any more. */
  isSettled: boolean;
  /** Every catalogue failed — as opposed to one, which is only a bad section. */
  isAllFailed: boolean;
}

/**
 * Search every catalogue in parallel, one query each.
 *
 * The merged endpoint fans out to three upstreams and resolves only when the slowest does,
 * so the whole grid waited on the worst case. Running one query per catalogue lets each
 * section paint as soon as its own upstream answers, with the rest still showing skeletons.
 *
 * Sections stay in a fixed order rather than reordering by arrival. Appending by whichever
 * upstream wins the race would make posters jump around under the cursor as slower
 * catalogues land, and would lose the grouping that makes a title's origin obvious while
 * scanning a dense grid.
 *
 * Nothing here allocates a merged array: each section renders straight from its own query's
 * `data`, which TanStack Query keeps referentially stable, so an arriving catalogue does not
 * re-render the ones already on screen.
 *
 * @param query - User query. Blank input issues no requests.
 */
export function useCatalogSearch(query: string): UseCatalogSearchReturn {
  const trimmed = query.trim();
  const enabled = !!trimmed;

  const queries = useQueries({
    queries: SEARCH_CATALOGS.map((catalog) => ({
      queryKey: ['search', catalog.id, trimmed],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        searchCatalogContent(catalog.id, trimmed, { signal }),
      enabled,
      // A catalogue being down is a normal degraded state, not something to hammer.
      retry: 1,
    })),
  });

  const sections: CatalogSection[] = SEARCH_CATALOGS.map((catalog, i) => {
    const q = queries[i];
    return {
      id: catalog.id,
      label: catalog.label,
      results: q.data ?? EMPTY_RESULTS,
      isPending: enabled && q.isPending,
      isError: q.isError,
      retry: q.refetch,
    };
  });

  let totalCount = 0;
  let pendingCount = 0;
  let errorCount = 0;
  for (const section of sections) {
    totalCount += section.results.length;
    if (section.isPending) pendingCount++;
    if (section.isError) errorCount++;
  }

  const isAnyPending = pendingCount > 0;
  const isSettled = enabled && !isAnyPending;
  const isAllFailed = enabled && errorCount === sections.length;

  // Report the search once, when the last catalogue lands — not per section, which would
  // fire three events for one user action and skew the no-results rate.
  const reportedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isSettled || reportedRef.current === trimmed) return;
    reportedRef.current = trimmed;
    const normalized = trimmed.toLowerCase();
    trackEvent('search', { query: normalized });
    if (totalCount === 0) {
      trackEvent('search_no_results', { query: normalized });
    }
  }, [isSettled, trimmed, totalCount]);

  return { sections, totalCount, isAnyPending, isSettled, isAllFailed };
}

/** Shared empty array so a pending section keeps a stable `results` reference. */
const EMPTY_RESULTS: SearchResult[] = [];
