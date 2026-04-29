'use client';

import { useEffect, useState } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function AppSkeletonTheme({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <SkeletonTheme
      baseColor={isDark ? '#1a1a1a' : '#e5e5e5'}
      highlightColor={isDark ? '#2a2a2a' : '#f0f0f0'}
      borderRadius={0}
    >
      {children}
    </SkeletonTheme>
  );
}

export { Skeleton };
