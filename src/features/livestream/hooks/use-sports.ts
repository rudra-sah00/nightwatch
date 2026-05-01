import { useEffect, useState } from 'react';
import { fetchSports } from '../api';

/** A sport category available for livestream filtering. */
export interface Sport {
  /** Unique sport identifier (e.g. `"basketball"`, `"all_channels"`). */
  id: string;
  /** Human-readable display label. */
  label: string;
}

/**
 * Fetches the list of available sport categories from the API.
 *
 * Always includes a hardcoded "All Channels" entry as the first item.
 * Aborts the request on unmount.
 *
 * @returns Array of sports and a loading flag.
 */
export function useSports() {
  const [sports, setSports] = useState<Sport[]>([
    { id: 'all_channels', label: 'All Channels' },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSports() {
      try {
        setIsLoading(true);
        const dynamicSports = await fetchSports(controller.signal);
        if (dynamicSports.length > 0) {
          setSports([
            { id: 'all_channels', label: 'All Channels' },
            ...dynamicSports,
          ]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load sports', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSports();

    return () => controller.abort();
  }, []);

  return { sports, isLoading };
}
