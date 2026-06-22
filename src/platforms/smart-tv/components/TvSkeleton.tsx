'use client';

export function TvRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="mb-8">
      <div className="h-5 w-40 bg-muted rounded mx-8 mb-3 animate-pulse" />
      <div className="flex gap-4 px-8 overflow-hidden">
        {Array.from({ length: count }, (_, idx) => (
          <div
            key={`rs-${idx.toString()}`}
            className="tv-card animate-pulse bg-muted shrink-0"
          />
        ))}
      </div>
    </section>
  );
}

export function TvGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 px-8 py-4">
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={`gs-${idx.toString()}`}
          className="tv-card animate-pulse bg-muted"
        />
      ))}
    </div>
  );
}

export function TvPageSkeleton() {
  return (
    <div className="py-8">
      <TvRowSkeleton />
      <TvRowSkeleton />
      <TvRowSkeleton count={4} />
    </div>
  );
}
