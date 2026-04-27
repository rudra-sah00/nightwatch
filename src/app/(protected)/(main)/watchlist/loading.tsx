import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function WatchlistLoading() {
  return (
    <AppSkeletonTheme>
      <div className="min-h-[calc(100vh-80px)] pb-32 flex flex-col">
        {/* Hero */}
        <div className="mb-12 bg-neo-red relative overflow-hidden shrink-0 rounded-2xl">
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />
          <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
            <div className="h-[72px] md:h-[120px] lg:h-[144px]" />
            <Skeleton
              height={40}
              width={224}
              baseColor="rgba(255,255,255,0.2)"
              highlightColor="rgba(255,255,255,0.1)"
            />
          </div>
        </div>

        {/* Cards */}
        <div className="container mx-auto px-6 md:px-10 flex-1">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {[192, 160, 224, 176].map((w) => (
              <div
                key={w}
                className="flex w-full bg-card border-[3px] border-border overflow-hidden"
              >
                <div className="w-24 sm:w-28 shrink-0 border-r-[3px] border-border hidden sm:block min-h-[100px]">
                  <Skeleton height="100%" />
                </div>
                <div className="flex-1 p-5">
                  <div className="space-y-2">
                    <Skeleton height={20} width={w} />
                    <Skeleton height={12} width={80} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
