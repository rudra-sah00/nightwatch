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
 * Mirrors the {@link LiveMatchCard} layout: stacks vertically on mobile
 * (`flex-col`) and switches to horizontal on desktop (`md:flex-row`).
 */
export function LiveMatchSkeleton() {
  return (
    <AppSkeletonTheme>
      <div
        aria-hidden="true"
        className="bg-card border-[3px] border-border p-4 flex flex-col md:flex-row items-center gap-6 rounded-md"
      >
        {/* Status / League column */}
        <div className="flex flex-col items-center md:items-start w-full md:w-32 flex-shrink-0 gap-2">
          <Skeleton width={64} height={24} />
          <Skeleton width={80} height={16} />
          <Skeleton width={48} height={10} />
        </div>

        {/* Teams center */}
        <div className="flex flex-1 items-center justify-center gap-4 w-full">
          {/* Team 1 */}
          <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
            <div className="flex flex-col items-end gap-1">
              <Skeleton width={72} height={16} />
              <Skeleton width={40} height={14} />
            </div>
            <Skeleton circle width={40} height={40} />
          </div>

          {/* VS */}
          <Skeleton width={32} height={28} />

          {/* Team 2 */}
          <div className="flex flex-1 items-center justify-start gap-2 md:gap-3">
            <Skeleton circle width={40} height={40} />
            <div className="flex flex-col items-start gap-1">
              <Skeleton width={72} height={16} />
              <Skeleton width={40} height={14} />
            </div>
          </div>
        </div>

        {/* Watch button */}
        <div className="w-full md:w-auto flex-shrink-0 flex justify-end mt-2 md:mt-0">
          <Skeleton
            width={192}
            height={48}
            containerClassName="w-full md:w-48 block"
          />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
