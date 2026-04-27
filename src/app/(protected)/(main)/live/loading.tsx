import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function LiveLoading() {
  return (
    <AppSkeletonTheme>
      <div className="min-h-[calc(100vh-80px)] pb-32">
        <div className="mb-12 bg-neo-yellow rounded-2xl">
          <div className="container mx-auto px-6 py-12 md:px-10">
            <Skeleton
              height={80}
              width={256}
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
        </div>
        <div className="container mx-auto px-6 md:px-10">
          <div className="flex gap-3 mb-8">
            <Skeleton height={40} width={96} />
            <Skeleton height={40} width={80} />
            <Skeleton height={40} width={112} />
            <Skeleton height={40} width={80} />
          </div>
          <div className="space-y-4">
            {[192, 160, 208, 176, 200].map((w) => (
              <div
                key={w}
                className="flex items-center gap-4 p-4 border-[3px] border-border"
              >
                <Skeleton circle width={48} height={48} />
                <div className="flex-1">
                  <Skeleton
                    height={20}
                    width={w}
                    containerClassName="mb-2 block"
                  />
                  <Skeleton height={16} width={w - 64} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
