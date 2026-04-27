import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';

export default function ProfileLoading() {
  return (
    <AppSkeletonTheme>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12 w-full">
        {/* Profile card */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center md:items-start md:flex-row gap-6 md:gap-8 min-h-[320px]">
          <Skeleton
            width={192}
            height={192}
            containerClassName="md:w-56 md:h-56 shrink-0 block"
          />
          <div className="flex-1 space-y-6 w-full pt-4">
            <Skeleton height={40} width={192} />
            <Skeleton height={32} width={256} />
            <div className="space-y-2">
              <Skeleton height={16} width={80} />
              <Skeleton
                height={32}
                width="100%"
                containerClassName="max-w-sm block"
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
          <Skeleton height={32} width={192} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </section>

        {/* Security */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
          <Skeleton height={32} width={224} />
          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Skeleton height={16} width={128} />
              <Skeleton height={40} />
            </div>
            <div className="space-y-2">
              <Skeleton height={16} width={112} />
              <Skeleton height={40} />
            </div>
            <div className="space-y-2">
              <Skeleton height={16} width={144} />
              <Skeleton height={40} />
            </div>
          </div>
        </section>
      </main>
    </AppSkeletonTheme>
  );
}
