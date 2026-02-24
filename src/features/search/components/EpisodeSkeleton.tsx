'use client';

export function EpisodeSkeleton() {
  return (
    <div className="flex gap-4 p-3 rounded-xl border border-transparent w-full animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="relative w-40 md:w-48 aspect-video rounded-lg bg-muted flex-shrink-0" />

      {/* Info Skeleton */}
      <div className="flex-1 min-w-0 py-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-6 bg-muted rounded" />
          <div className="h-5 w-3/4 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-5/6 bg-muted/60 rounded" />
        </div>
        <div className="h-3 w-16 bg-muted/40 rounded mt-2" />
      </div>
    </div>
  );
}
