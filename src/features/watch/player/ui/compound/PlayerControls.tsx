import { use } from 'react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { EpisodePanelContext } from './PlayerEpisodePanel';

/**
 * Wrapper for the player's control bar overlay.
 *
 * Positioned absolutely over the video, it fades in/out based on
 * `state.showControls` and hides entirely when the episode panel is open.
 * On mobile the children are laid out with `justify-between` (top-to-bottom),
 * while on desktop they stack at the bottom with `justify-end`.
 *
 * @param props.children - Control rows, seekbar, and mobile bars to render inside the overlay.
 */
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

/**
 * Desktop-only control row containing play/pause, volume, seekbar, settings, and fullscreen buttons.
 *
 * Hidden on mobile (`hidden md:block`). Applies safe-area padding at the bottom
 * for notched devices and scales spacing across breakpoints.
 *
 * @param props.children - Individual control buttons laid out in a horizontal flex row.
 */
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

/**
 * YouTube-style mobile top bar: PiP minimize button top-left, settings gear top-right.
 *
 * Only visible on mobile (`md:hidden`). Receives pointer events so buttons remain tappable.
 *
 * @param props.children - Typically {@link PlayerPipButton} and {@link SettingsMenu}.
 */
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

/**
 * YouTube-style mobile center controls: previous / play-pause / next buttons centered in the player.
 *
 * Automatically hidden during loading or buffering states so only the spinner overlay is visible.
 *
 * @param props.children - Typically skip-back, {@link PlayPause}, and skip-forward buttons.
 */
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

/**
 * Flexible spacer element used inside control rows to push siblings apart.
 *
 * Renders a `flex-1` div with a minimum width to guarantee visual separation.
 */
export function PlayerSpacer() {
  return <div className="flex-1 min-w-4" />;
}

/**
 * Absolutely-positioned container pinned to the bottom-right corner on mobile.
 *
 * Typically holds the fullscreen toggle button, placed just above the mobile seekbar.
 *
 * @param props.children - Usually {@link PlayerFullscreen}.
 */
export function PlayerMobileBottomRight({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:hidden absolute bottom-3 right-3 pointer-events-auto">
      {children}
    </div>
  );
}
