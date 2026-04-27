import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function HomeLoading() {
  return (
    <AppSkeletonTheme>
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-[calc(100dvh-120px)] min-h-[600px] w-full">
        <Skeleton height={64} width={320} containerClassName="mb-6 block" />
        <Skeleton height={48} width={256} containerClassName="mb-4 block" />
        <Skeleton height={20} width={192} />
      </main>
    </AppSkeletonTheme>
  );
}
