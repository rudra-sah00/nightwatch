'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function AppSkeletonTheme({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme
      baseColor="#1a1a1a"
      highlightColor="#2a2a2a"
      borderRadius={0}
    >
      {children}
    </SkeletonTheme>
  );
}

export { Skeleton };
