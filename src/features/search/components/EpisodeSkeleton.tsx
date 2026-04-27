'use client';

import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export function EpisodeSkeleton() {
  return (
    <AppSkeletonTheme>
      <div className="flex gap-4 p-4 border-[3px] border-border w-full bg-card">
        <div className="relative w-40 md:w-56 aspect-video flex-shrink-0 border-r-[3px] border-border -m-4 mr-0">
          <Skeleton height="100%" />
        </div>
        <div className="flex-1 min-w-0 py-1 space-y-4 pr-2">
          <div className="flex items-center gap-3">
            <Skeleton width={40} height={16} />
            <Skeleton width="75%" height={24} />
          </div>
          <div className="space-y-2">
            <Skeleton height={16} />
            <Skeleton width="83%" height={16} />
          </div>
          <Skeleton width={96} height={12} />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
