'use client';

/**
 * Shared skeleton components for loading states.
 */

export function SearchSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-background border-4 border-border p-2  animate-pulse flex flex-col h-full w-full"
    >
      <div className="aspect-[2/3] border-2 border-border bg-muted mb-4 flex-shrink-0" />
      <div className="px-2 pb-2 flex flex-col flex-1">
        {/* Title skeleton */}
        <div className="h-8 bg-muted mb-2 w-full" />
        <div className="h-8 bg-muted mb-2 w-2/3" />
      </div>
    </div>
  );
}

export function WatchProgressSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-background border-4 border-border p-2  animate-pulse flex flex-col h-full w-full"
    >
      {/* Poster area matching search grid */}
      <div className="aspect-[2/3] border-2 border-border bg-muted mb-4 flex-shrink-0 relative overflow-hidden">
        {/* Progress bar skeleton at bottom of poster */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary/20" />
      </div>
      <div className="px-2 pb-2 flex flex-col flex-1 space-y-3">
        {/* Badge skeleton */}
        <div className="h-5 w-16 bg-muted border-2 border-border/10" />
        {/* Title skeleton */}
        <div className="h-8 bg-muted w-full mb-1" />
        {/* Subtitle skeleton */}
        <div className="h-4 bg-muted w-2/3" />
      </div>
    </div>
  );
}

export function LiveMatchSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="group relative bg-background border-b-[3px] border-border/5 animate-pulse w-full"
    >
      <div className="flex items-center gap-4 px-6 py-5">
        {/* Status Column */}
        <div className="w-20 flex-shrink-0 flex flex-col items-center gap-2">
          <div className="h-4 w-12 bg-muted border-2 border-border/10" />
          <div className="h-2 w-16 bg-muted/60" />
        </div>

        <div className="w-[3px] h-10 bg-primary/10 hidden sm:block" />

        {/* Teams Column */}
        <div className="flex-grow min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-muted border-2 border-border/10 rounded-sm" />
            <div className="h-4 w-32 bg-muted" />
            <div className="ml-auto h-4 w-8 bg-muted/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-muted border-2 border-border/10 rounded-sm" />
            <div className="h-4 w-32 bg-muted" />
            <div className="ml-auto h-4 w-8 bg-muted/40" />
          </div>
        </div>

        <div className="w-32 flex-shrink-0 hidden lg:flex items-center justify-center">
          <div className="h-5 w-20 bg-muted border-2 border-border/10" />
        </div>

        {/* Action Button */}
        <div className="w-24 flex-shrink-0 flex justify-end">
          <div className="h-8 w-20 bg-muted border-[3px] border-border/20" />
        </div>
      </div>
    </div>
  );
}
