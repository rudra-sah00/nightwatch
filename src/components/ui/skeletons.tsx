'use client';

/**
 * Shared skeleton components for loading states.
 */

export function SearchSkeleton() {
  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-2 neo-shadow animate-pulse flex flex-col h-full w-full">
      <div className="aspect-[2/3] border-2 border-[#1a1a1a] bg-[#e8e3da] mb-4 flex-shrink-0" />
      <div className="px-2 pb-2 flex flex-col flex-1">
        <div className="h-8 bg-[#e8e3da] mb-2 w-3/4" />
        <div className="h-8 bg-[#e8e3da] mb-6 w-1/2" />
        <div className="flex flex-col gap-2 mt-auto">
          <div className="h-[52px] border-4 border-[#1a1a1a] bg-[#e8e3da] w-full" />
          <div className="h-[52px] border-4 border-[#1a1a1a] bg-[#e8e3da] w-full" />
        </div>
      </div>
    </div>
  );
}

export function WatchProgressSkeleton() {
  return (
    <div className="flex items-center gap-4 p-2 rounded-xl border border-transparent w-full animate-pulse">
      {/* Big Thumbnail Skeleton */}
      <div className="relative w-48 aspect-video rounded-lg bg-muted/60 flex-shrink-0" />

      {/* Info Skeleton */}
      <div className="flex-1 min-w-0 py-1 space-y-3">
        <div className="h-4 w-16 bg-muted/40 rounded" />
        <div className="h-6 w-1/2 bg-muted/60 rounded" />
        <div className="space-y-1.5">
          <div className="h-4 w-2/3 bg-muted/40 rounded" />
          <div className="h-3 w-20 bg-muted/20 rounded" />
        </div>
      </div>
    </div>
  );
}
