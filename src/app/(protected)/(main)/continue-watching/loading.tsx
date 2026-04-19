export default function ContinueWatchingLoading() {
  const card = 'border-[3px] border-border p-3';
  return (
    <main className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-pulse">
      <div className="border-b-[4px] border-border mb-12 bg-neo-blue">
        <div className="container mx-auto px-6 py-12 md:px-10">
          <div className="h-20 md:h-32 w-72 bg-primary-foreground/10 rounded mb-4" />
          <div className="h-6 w-48 bg-primary-foreground/10 rounded" />
        </div>
      </div>
      <div className="container mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-3/4 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-2/3 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-3/4 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-1/2 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-3/4 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
          <div className={card}>
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="h-5 w-2/3 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
