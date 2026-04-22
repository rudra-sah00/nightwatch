export default function HomeLoading() {
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-[calc(100dvh-120px)] min-h-[600px] w-full animate-pulse">
      <div className="h-16 md:h-24 w-80 bg-muted rounded mb-6" />
      <div className="h-12 w-64 bg-muted rounded mb-4" />
      <div className="h-5 w-48 bg-muted rounded" />
    </main>
  );
}
