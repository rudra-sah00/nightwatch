export default function DownloadsLoading() {
  const row = 'flex gap-4 p-4 border-[3px] border-border';
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-pulse">
      <div className="container mx-auto px-6 py-12 md:px-10">
        <div className="h-14 w-56 bg-muted rounded mb-2" />
        <div className="h-5 w-36 bg-muted rounded mb-10" />
        <div className="space-y-4">
          <div className={row}>
            <div className="w-32 aspect-video bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-32 aspect-video bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-32 aspect-video bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-52 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
          <div className={row}>
            <div className="w-32 aspect-video bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-44 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
