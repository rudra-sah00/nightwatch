export function PlayerLoadingSkeleton() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="w-full h-full bg-black" />
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-36 md:h-48 lg:h-56 2xl:h-64 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 md:h-56 lg:h-64 2xl:h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 flex items-center gap-4 lg:gap-6 z-20 opacity-0"></div>
        <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 space-y-2 md:space-y-3 lg:space-y-4">
          <div className="relative py-2 lg:py-3 2xl:py-4">
            <div className="relative h-1.5 lg:h-2 2xl:h-3 bg-white/20 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 animate-pulse" />
              <div className="text-white text-sm md:text-base lg:text-lg font-medium tabular-nums">
                0:00 <span className="text-white/50 mx-2">/</span>{' '}
                <span className="text-white/70">0:00</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 animate-pulse" />
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 animate-pulse" />
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
