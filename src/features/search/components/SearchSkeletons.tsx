'use client';

export function SearchSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-transparent w-full animate-pulse">
      {/* Landscape Thumbnail Skeleton */}
      <div className="relative w-24 md:w-32 aspect-video flex-shrink-0 rounded-lg bg-muted/60" />

      {/* Info Skeleton */}
      <div className="flex-1 min-w-0 py-1 space-y-2">
        <div className="h-5 w-3/4 bg-muted/60 rounded" />
        <div className="h-4 w-12 bg-muted/40 rounded" />
      </div>

      {/* Arrow Skeleton */}
      <div className="w-5 h-5 bg-muted/20 rounded-full flex-shrink-0" />
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
