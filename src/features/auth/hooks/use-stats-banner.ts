'use client';

import { useEffect, useState } from 'react';
import { getPlatformStats, type PlatformStats } from '@/features/auth/api';

export function useStatsBanner() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  return { stats, isLoading };
}
