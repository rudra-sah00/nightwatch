export default function WatchlistLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background pb-32 flex flex-col">
      {/* Hero - red bg, same as real page */}
      <div className="mb-12 bg-neo-red relative overflow-hidden shrink-0 rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />
        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="h-[72px] md:h-[120px] lg:h-[144px]" />
          <div className="h-10 w-56 bg-white/20 rounded mt-4" />
        </div>
      </div>

      {/* Cards - same structure as WatchlistCard */}
      <div className="container mx-auto px-6 md:px-10 flex-1">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <WatchlistSkeleton w="w-48" />
          <WatchlistSkeleton w="w-40" />
          <WatchlistSkeleton w="w-56" />
          <WatchlistSkeleton w="w-44" />
        </div>
      </div>
    </div>
  );
}

function WatchlistSkeleton({ w }: { w: string }) {
  return (
    <div className="flex w-full bg-card border-[3px] border-border overflow-hidden animate-pulse">
      <div className="w-24 sm:w-28 shrink-0 bg-muted border-r-[3px] border-border hidden sm:block min-h-[100px]" />
      <div className="flex-1 p-5">
        <div className="space-y-2">
          <div className={`h-5 ${w} bg-muted rounded`} />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
