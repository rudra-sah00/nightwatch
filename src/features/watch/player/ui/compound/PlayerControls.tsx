import { use } from 'react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { EpisodePanelContext } from './PlayerEpisodePanel';

export function PlayerControls({ children }: { children: React.ReactNode }) {
  const { state } = usePlayerContext();
  const episodeCtx = use(EpisodePanelContext);
  const hideForPanel = episodeCtx?.isOpen ?? false;

  return (
    <div
      className={cn(
        'control-bar absolute inset-0 z-30 flex flex-col pointer-events-none transition-opacity duration-300',
        // Mobile: space-between to push seekbar to bottom; Desktop: justify-end
        'justify-between md:justify-end',
        hideForPanel
          ? 'opacity-0 pointer-events-none'
          : state.showControls || state.isLoading
            ? 'opacity-100'
            : 'opacity-0',
      )}
    >
      {children}
    </div>
  );
}

export function PlayerControlRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative hidden md:block px-2 py-3 min-[380px]:p-3 md:p-6 lg:p-8 2xl:p-10 space-y-1 min-[380px]:space-y-2 md:space-y-3 lg:space-y-4 pointer-events-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[380px]:pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div className="flex w-full items-center gap-0.5 min-[380px]:gap-1 md:gap-2 lg:gap-3 2xl:gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/** YouTube-style mobile top bar: PiP arrow top-left, settings top-right */
export function PlayerMobileTopBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:hidden flex items-center justify-between gap-2 px-3 pt-2 pointer-events-auto">
      {children}
    </div>
  );
}

/** YouTube-style mobile center: prev / play / next centered in player.
 *  Hidden during loading/buffering so only the spinner is visible. */
export function PlayerMobileCenterControls({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = usePlayerContext();
  if (state.isLoading || state.isBuffering) return null;
  return (
    <div className="md:hidden flex flex-1 items-center justify-center gap-8 pointer-events-auto">
      {children}
    </div>
  );
}

export function PlayerSpacer() {
  return <div className="flex-1 min-w-4" />;
}

/** Fullscreen button pinned to bottom-right on mobile (above seekbar) */
export function PlayerMobileBottomRight({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:hidden absolute bottom-6 right-3 pointer-events-auto">
      {children}
    </div>
  );
}
