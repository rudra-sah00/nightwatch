'use client';

/**
 * Shared skeleton components for loading states.
 */

export function SearchSkeleton() {
  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-2 neo-shadow animate-pulse flex flex-col h-full w-full">
      <div className="aspect-[2/3] border-2 border-[#1a1a1a] bg-[#e8e3da] mb-4 flex-shrink-0" />
      <div className="px-2 pb-2 flex flex-col flex-1">
        {/* Title skeleton */}
        <div className="h-8 bg-[#e8e3da] mb-2 w-full" />
        <div className="h-8 bg-[#e8e3da] mb-2 w-2/3" />
      </div>
    </div>
  );
}

export function WatchProgressSkeleton() {
  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-2 neo-shadow animate-pulse flex flex-col h-full w-full">
      {/* Poster area matching search grid */}
      <div className="aspect-[2/3] border-2 border-[#1a1a1a] bg-[#e8e3da] mb-4 flex-shrink-0 relative overflow-hidden">
        {/* Progress bar skeleton at bottom of poster */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#1a1a1a]/20" />
      </div>
      <div className="px-2 pb-2 flex flex-col flex-1 space-y-3">
        {/* Badge skeleton */}
        <div className="h-5 w-16 bg-[#e8e3da] border-2 border-[#1a1a1a]/10" />
        {/* Title skeleton */}
        <div className="h-8 bg-[#e8e3da] w-full mb-1" />
        {/* Subtitle skeleton */}
        <div className="h-4 bg-[#e8e3da] w-2/3" />
      </div>
    </div>
  );
}

export function LiveMatchSkeleton({
  variant = 'compact',
}: {
  variant?: 'featured' | 'compact';
}) {
  if (variant === 'featured') {
    return (
      <div className="bg-white border-4 border-[#1a1a1a] neo-shadow-sm animate-pulse flex flex-col w-full">
        <div className="h-12 border-b-4 border-[#1a1a1a] bg-[#f5f0e8]" />
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-[#e8e3da] border-[3px] border-[#1a1a1a]/10" />
              <div className="h-6 w-24 bg-[#e8e3da]" />
            </div>
            <div className="h-8 w-12 bg-[#e8e3da]" />
          </div>
          <div className="h-4 w-full bg-[#1a1a1a]/10" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-[#e8e3da] border-[3px] border-[#1a1a1a]/10" />
              <div className="h-6 w-24 bg-[#e8e3da]" />
            </div>
            <div className="h-8 w-12 bg-[#e8e3da]" />
          </div>
        </div>
        <div className="h-16 border-t-4 border-[#1a1a1a] bg-[#1a1a1a]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-white border-b-2 border-[#1a1a1a]/10 animate-pulse w-full">
      <div className="w-12 h-8 bg-[#e8e3da] border-2 border-[#1a1a1a]/10" />
      <div className="w-[3px] h-10 bg-[#1a1a1a]/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-[#e8e3da]" />
        <div className="h-4 w-32 bg-[#e8e3da]" />
      </div>
      <div className="w-16 h-8 bg-[#e8e3da]" />
    </div>
  );
}
