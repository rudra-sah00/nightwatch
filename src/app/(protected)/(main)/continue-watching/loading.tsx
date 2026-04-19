export default function ContinueWatchingLoading() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-background pb-32">
      {/* Hero Header - exact match */}
      <div className="border-b-[4px] border-border mb-12 bg-neo-blue relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />
        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="h-[72px] md:h-[120px] lg:h-[144px]" />
          <div className="h-10 w-72 bg-background/20 rounded mt-4" />
        </div>
      </div>

      {/* Cards - matches ContinueWatching component */}
      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto py-6">
          <div className="flex flex-col gap-6">
            <SkeletonCard widths={['w-48', 'w-64']} />
            <SkeletonCard widths={['w-40', 'w-52']} />
            <SkeletonCard widths={['w-56', 'w-44']} />
            <SkeletonCard widths={['w-44', 'w-56']} />
          </div>
        </div>
      </div>
    </main>
  );
}

function SkeletonCard({ widths }: { widths: [string, string] }) {
  return (
    <div className="flex w-full bg-card border-[3px] border-border overflow-hidden animate-pulse">
      {/* Poster */}
      <div className="w-24 sm:w-28 shrink-0 bg-muted border-r-[3px] border-border hidden sm:block min-h-[120px]" />
      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div className="space-y-2">
          <div className={`h-5 ${widths[0]} bg-muted rounded`} />
          <div className={`h-3 ${widths[1]} bg-muted rounded`} />
        </div>
        {/* Progress bar */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-3 bg-muted border-[2px] border-border" />
        </div>
      </div>
    </div>
  );
}
