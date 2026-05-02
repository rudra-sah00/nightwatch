import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import { LiveMatchSkeleton } from '@/components/ui/skeletons';

export default function LiveLoading() {
  return (
    <AppSkeletonTheme>
      <div className="min-h-[calc(100vh-80px)] pb-32">
        {/* Hero header skeleton */}
        <div className="mb-12 bg-neo-yellow rounded-2xl">
          <div className="container mx-auto px-6 py-12 md:px-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div>
                <Skeleton
                  height={64}
                  width={220}
                  baseColor="rgba(0,0,0,0.1)"
                  highlightColor="rgba(0,0,0,0.05)"
                  containerClassName="mb-2 block"
                />
                <Skeleton
                  height={48}
                  width={180}
                  baseColor="rgba(0,0,0,0.1)"
                  highlightColor="rgba(0,0,0,0.05)"
                  containerClassName="mb-4 block"
                />
                <Skeleton
                  height={24}
                  width={192}
                  baseColor="rgba(0,0,0,0.1)"
                  highlightColor="rgba(0,0,0,0.05)"
                />
              </div>
              {/* Sport selector skeleton */}
              <div className="w-full md:w-auto flex-grow min-w-0">
                <Skeleton
                  height={10}
                  width={120}
                  baseColor="rgba(0,0,0,0.1)"
                  highlightColor="rgba(0,0,0,0.05)"
                  containerClassName="mb-2 block"
                />
                <Skeleton
                  height={52}
                  baseColor="rgba(0,0,0,0.1)"
                  highlightColor="rgba(0,0,0,0.05)"
                  containerClassName="block"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Match list skeleton */}
        <div className="container mx-auto px-6 md:px-10">
          <div className="space-y-16">
            <section>
              <div className="h-10 w-48 bg-neo-blue border-[4px] border-border px-5 py-3 mb-8 animate-pulse" />
              <div className="flex flex-col gap-4">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
