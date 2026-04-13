'use client';

export function EpisodeSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-[3px] border-border  w-full animate-pulse bg-card">
      {/* Thumbnail Skeleton */}
      <div className="relative w-40 md:w-56 aspect-video bg-background flex-shrink-0 border-r-[3px] border-border -m-4 mr-0" />

      {/* Info Skeleton */}
      <div className="flex-1 min-w-0 py-1 space-y-4 pr-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-10 bg-primary/20" />
          <div className="h-6 w-3/4 bg-primary/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-primary/5" />
          <div className="h-4 w-5/6 bg-primary/5" />
        </div>
        <div className="h-3 w-24 bg-primary/10 mt-3" />
      </div>
    </div>
  );
}
