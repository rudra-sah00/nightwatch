import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';

export function PlayerControls({ children }: { children: React.ReactNode }) {
  const { state } = usePlayerContext();

  return (
    <div
      className={cn(
        'control-bar absolute inset-0 z-30 flex flex-col justify-end pointer-events-none transition-opacity duration-300',
        state.showControls || state.isLoading ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-36 md:h-48 lg:h-56 2xl:h-64 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 md:h-56 lg:h-64 2xl:h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {children}
    </div>
  );
}

export function PlayerControlRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 space-y-2 md:space-y-3 lg:space-y-4 pointer-events-auto pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div className="flex w-full items-center gap-1 md:gap-2 lg:gap-3 2xl:gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PlayerSpacer() {
  return <div className="flex-1 min-w-4" />;
}
