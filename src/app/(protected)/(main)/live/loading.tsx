export default function LiveLoading() {
  const row = 'flex items-center gap-4 p-4 border-[3px] border-border';
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-pulse">
      <div className="mb-12 bg-neo-yellow rounded-2xl">
        <div className="container mx-auto px-6 py-12 md:px-10">
          <div className="h-20 md:h-32 w-64 bg-foreground/10 rounded mb-4" />
          <div className="h-6 w-48 bg-foreground/10 rounded" />
        </div>
      </div>
      <div className="container mx-auto px-6 md:px-10">
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-24 bg-muted rounded" />
          <div className="h-10 w-20 bg-muted rounded" />
          <div className="h-10 w-28 bg-muted rounded" />
          <div className="h-10 w-20 bg-muted rounded" />
        </div>
        <div className="space-y-4">
          <div className={row}>
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-40 bg-muted rounded mb-2" />
              <div className="h-4 w-28 bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-52 bg-muted rounded mb-2" />
              <div className="h-4 w-36 bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-44 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
