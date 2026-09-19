'use client';

import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

/**
 * Skeleton placeholder for a search result card.
 *
 * Renders a 2:3 aspect-ratio poster area and two title lines inside a
 * neo-brutalist bordered container. Hidden from assistive technology.
 */
export function SearchSkeleton() {
  return (
    <AppSkeletonTheme>
      <div aria-hidden="true" className="flex flex-col w-full">
        <Skeleton
          containerClassName="aspect-[2/3] rounded-lg border-2 border-border block overflow-hidden"
          height="100%"
        />
        <div className="mt-2">
          <Skeleton height={14} className="mb-1" />
          <Skeleton height={14} width="60%" />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
