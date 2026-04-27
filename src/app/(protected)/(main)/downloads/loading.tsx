import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function DownloadsLoading() {
  return (
    <AppSkeletonTheme>
      <div className="min-h-[calc(100vh-80px)] pb-32">
        <div className="container mx-auto px-6 py-12 md:px-10">
          <Skeleton height={56} width={224} containerClassName="mb-2 block" />
          <Skeleton height={20} width={144} containerClassName="mb-10 block" />
          <div className="space-y-4">
            {[192, 160, 208, 176].map((w) => (
              <div
                key={w}
                className="flex gap-4 p-4 border-[3px] border-border"
              >
                <div className="w-32 aspect-video">
                  <Skeleton height="100%" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton height={20} width={w} />
                  <Skeleton height={16} width={w - 64} />
                  <Skeleton height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppSkeletonTheme>
  );
}
