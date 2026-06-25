import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

const CARD_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function RowSkeleton({ id, titleWidth }: { id: string; titleWidth: number }) {
  return (
    <section>
      <Skeleton
        height={24}
        width={titleWidth}
        containerClassName="block mb-4"
      />
      <div className="flex gap-3 overflow-hidden">
        {CARD_KEYS.map((k) => (
          <div key={`${id}-${k}`} className="shrink-0 w-[120px] sm:w-[140px]">
            <Skeleton
              containerClassName="block aspect-[2/3] w-full"
              height="100%"
            />
            <Skeleton height={12} width="80%" containerClassName="block mt-2" />
            <Skeleton height={10} width="50%" containerClassName="block mt-1" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomeLoading() {
  return (
    <AppSkeletonTheme>
      <div className="w-full h-full overflow-hidden">
        {/* Hero banner skeleton */}
        <div className="w-full aspect-[16/7] sm:aspect-[21/9] max-h-[400px]">
          <Skeleton height="100%" containerClassName="block h-full" />
        </div>

        {/* Content rows skeleton */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
          <RowSkeleton id="r0" titleWidth={180} />
          <RowSkeleton id="r1" titleWidth={140} />
          <RowSkeleton id="r2" titleWidth={200} />
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
