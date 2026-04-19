export default function MainLoading() {
  return (
    <div className="container mx-auto px-6 py-12 md:px-10 min-h-[calc(100vh-80px)] animate-pulse">
      <div className="mb-12">
        <div className="h-12 w-64 bg-muted rounded mb-4" />
        <div className="h-5 w-48 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`sk-${
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              i
            }`}
            className="aspect-[2/3] bg-muted rounded"
          />
        ))}
      </div>
    </div>
  );
}
