export default function MessagesLoading() {
  return (
    <main className="min-h-full pb-32 animate-pulse">
      <div className="container mx-auto px-6 md:px-10 pt-6">
        <div className="h-10 w-60 bg-muted rounded-lg mb-4" />
        <div className="flex gap-6">
          <div className="w-80 shrink-0 space-y-3">
            {['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => (
              <div key={id} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'].map((id, i) => (
              <div
                key={id}
                className={`h-12 bg-muted rounded-xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2 ml-auto'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
