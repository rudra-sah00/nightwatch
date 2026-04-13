import { useEffect, useState } from 'react';
import { fetchSports } from '../api';

export interface Sport {
  id: string;
  label: string;
}

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
