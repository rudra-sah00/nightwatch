'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { getShowDetails } from '../api';
import type { ShowDetails } from '../types';

/** Return value of the {@link useShowDetails} hook. */
interface UseShowDetailsReturn {
  show: ShowDetails | null;
  isLoading: boolean;
  setShow: (show: ShowDetails | null) => void;
}

/**
 * Hook that fetches show/movie details by content ID on mount.
 *
 * Uses `useTransition` to keep the UI responsive during the fetch and
 * aborts the request on unmount or when `contentId` changes.
 *
 * @param contentId - The provider-prefixed content identifier (e.g. `s1:12345`).
 * @returns {@link UseShowDetailsReturn}
 */
export function useShowDetails(contentId: string): UseShowDetailsReturn {
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    const fetchDetails = () => {
      startTransition(async () => {
        try {
          const details = await getShowDetails(contentId, {
            signal: controller.signal,
          });

          if (!controller.signal.aborted) {
            setShow(details);
          }
        } catch (error: unknown) {
          const isAborted =
            (error instanceof Error && error.name === 'AbortError') ||
            controller.signal.aborted;

          if (isAborted) return;

          toast.error(
            'Failed to load show details. Please check your connection and try again.',
          );
        }
      });
    };

    fetchDetails();

    return () => {
      controller.abort();
    };
  }, [contentId]);

  return { show, isLoading, setShow };
}
