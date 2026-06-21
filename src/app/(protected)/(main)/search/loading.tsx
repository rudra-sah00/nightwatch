import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function SearchLoading() {
  return (
    <AppSkeletonTheme>
      <div className="container mx-auto px-4 sm:px-6 py-6 md:py-10 md:px-10 min-h-[calc(100vh-80px)]">
        <div className="mb-6 md:mb-10">
          <Skeleton height={28} width={280} containerClassName="mb-2 block" />
          <Skeleton height={14} width={120} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => (
            <div key={id} className="flex flex-col w-full">
              <Skeleton
                containerClassName="aspect-[2/3] rounded-lg border-2 border-border block overflow-hidden"
                height="100%"
              />
              <div className="mt-2">
                <Skeleton height={14} containerClassName="mb-1 block" />
                <Skeleton height={14} width="60%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
