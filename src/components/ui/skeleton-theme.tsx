'use client';

import { useMemo } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

function useSkeletonColors() {
  return useMemo(() => {
    if (typeof document === 'undefined') {
      return { base: '#1a1a1a', highlight: '#2a2a2a' };
    }
    const isDark = document.documentElement.classList.contains('dark');
    return isDark
      ? { base: 'hsl(0 0% 15%)', highlight: 'hsl(0 0% 20%)' }
      : { base: 'hsl(38 20% 88%)', highlight: 'hsl(38 20% 93%)' };
  }, []);
}

export function AppSkeletonTheme({ children }: { children: React.ReactNode }) {
  const { base, highlight } = useSkeletonColors();
  return (
    <SkeletonTheme baseColor={base} highlightColor={highlight} borderRadius={0}>
      {children}
    </SkeletonTheme>
  );
}

export { Skeleton };
