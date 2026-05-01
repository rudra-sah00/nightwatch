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
      <div
        aria-hidden="true"
        className="bg-background border-4 border-border p-2 flex flex-col h-full w-full"
      >
        <Skeleton
          containerClassName="aspect-[2/3] border-2 border-border mb-4 flex-shrink-0 block"
          height="100%"
        />
        <div className="px-2 pb-2 flex flex-col flex-1">
          <Skeleton height={32} className="mb-2" />
          <Skeleton height={32} width="66%" />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}

/**
 * Skeleton placeholder for a "continue watching" card.
 *
 * Similar to {@link SearchSkeleton} but includes a progress bar indicator
 * and an extra metadata line.
 */
export function WatchProgressSkeleton() {
  return (
    <AppSkeletonTheme>
      <div
        aria-hidden="true"
        className="bg-background border-4 border-border p-2 flex flex-col h-full w-full"
      >
        <div className="aspect-[2/3] border-2 border-border mb-4 flex-shrink-0 relative overflow-hidden">
          <Skeleton height="100%" />
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary/20" />
        </div>
        <div className="px-2 pb-2 flex flex-col flex-1 space-y-3">
          <Skeleton height={20} width={64} />
          <Skeleton height={32} />
          <Skeleton height={16} width="66%" />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}

/**
 * Skeleton placeholder for a live match/event row.
 *
 * Mimics the two-team layout with score placeholders, team name lines,
 * and a CTA button area.
 */
export function LiveMatchSkeleton() {
  return (
    <AppSkeletonTheme>
      <div
        aria-hidden="true"
        className="group relative bg-background border-b-[3px] border-border/5 w-full"
      >
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-20 flex-shrink-0 flex flex-col items-center gap-2">
            <Skeleton width={48} height={16} />
            <Skeleton width={64} height={8} />
          </div>
          <div className="w-[3px] h-10 bg-primary/10 hidden sm:block" />
          <div className="flex-grow min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton width={24} height={24} />
              <Skeleton width={128} height={16} />
              <div className="ml-auto">
                <Skeleton width={32} height={16} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton width={24} height={24} />
              <Skeleton width={128} height={16} />
              <div className="ml-auto">
                <Skeleton width={32} height={16} />
              </div>
            </div>
          </div>
          <div className="w-32 flex-shrink-0 hidden lg:flex items-center justify-center">
            <Skeleton width={80} height={20} />
          </div>
          <div className="w-24 flex-shrink-0 flex justify-end">
            <Skeleton width={80} height={32} />
          </div>
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
