'use client';

import { Library } from 'lucide-react';
import type React from 'react';
import { useCallback } from 'react';
import type { Episode } from '@/features/search/types';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { EpisodePanel } from '../controls/EpisodePanel';
import { useEpisodePanel } from '../controls/hooks/use-episode-panel';

/**
 * Compound wrapper: manages state via useEpisodePanel and renders both
 * the slide-in panel and the control-row trigger button.
 *
 * Usage in a Player composition:
 *   <Player.EpisodePanel>
 *     <Player.Controls>
 *       <Player.ControlRow>
 *         <Player.EpisodePanelTrigger /> ← icon button in control bar
 *       </Player.ControlRow>
 *     </Player.Controls>
 *   </Player.EpisodePanel>
 *
 * Wraps children in context so the trigger can read open/toggle state.
 * For movie content, renders children only (no panel, no trigger).
 */

// The open/toggle state needs to be shared between the panel overlay
// and the trigger button (placed at different tree levels).
import { createContext, use } from 'react';

interface EpisodePanelContextValue {
  toggle: () => void;
  isOpen: boolean;
  panelNode: React.ReactNode;
}

export const EpisodePanelContext =
  createContext<EpisodePanelContextValue | null>(null);

export function PlayerEpisodePanel({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { metadata, onNavigate, playerHandlers } = usePlayerContext();

  const isSeries = metadata.type === 'series';
  const seriesId = metadata.seriesId || metadata.movieId;

  const panel = useEpisodePanel({
    seriesId: isSeries ? seriesId : undefined,
    currentSeason: metadata.season,
    currentEpisode: metadata.episode,
    isSeriesContent: isSeries,
    onInteraction: playerHandlers.handleInteraction,
  });

  // Destructure stable primitives / callbacks so handleEpisodeSelect doesn't
  // depend on the whole panel object (recreated every render).
  const { selectedSeason, close: closePanel } = panel;

  const handleEpisodeSelect = useCallback(
    (episode: Episode) => {
      if (!onNavigate || !seriesId) return;

      const params = new URLSearchParams({
        type: 'series',
        title: metadata.title,
        season: String(episode.seasonNumber ?? selectedSeason),
        episode: String(episode.episodeNumber),
        ...(metadata.posterUrl && {
          poster: encodeURIComponent(metadata.posterUrl),
        }),
        ...(metadata.year && { year: metadata.year }),
        ...(metadata.providerId && { server: metadata.providerId }),
        seriesId,
        ...(episode.title && { episodeTitle: episode.title }),
      });

      // Navigate immediately WITHOUT pre-fetching the stream URL.
      // Calling playVideo() here would call StreamService.createSessionWithToken
      // on the backend which immediately invalidates the current session token —
      // causing 401 errors on the still-playing HLS stream and the subtitle
      // track, and triggering a brief error flash before navigation completes.
      // useWatchContent handles stream fetching on mount via refetchStream().
      closePanel();
      onNavigate(`/watch/${encodeURIComponent(seriesId)}?${params.toString()}`);
    },
    [onNavigate, seriesId, metadata, selectedSeason, closePanel],
  );

  if (!isSeries) return <>{children}</>;

  return (
    <EpisodePanelContext
      value={{
        toggle: panel.toggle,
        isOpen: panel.isOpen,
        panelNode: (
          <EpisodePanel
            isOpen={panel.isOpen}
            episodes={panel.episodes}
            seasons={panel.seasons}
            selectedSeason={panel.selectedSeason}
            currentEpisode={metadata.episode}
            currentSeason={metadata.season}
            isLoading={panel.isLoading}
            onClose={panel.close}
            onSeasonChange={panel.onSeasonChange}
            onEpisodeSelect={handleEpisodeSelect}
            panelRef={panel.panelRef}
          />
        ),
      }}
    >
      {children}
    </EpisodePanelContext>
  );
}

/**
 * Renders the episode panel overlay.
 * Place as a sibling OUTSIDE Player.Controls so it layers independently.
 */
export function PlayerEpisodePanelOverlay() {
  const ctx = use(EpisodePanelContext);
  if (!ctx) return null;
  return <>{ctx.panelNode}</>;
}

/**
 * Trigger button placed in the control row.
 * Reads toggle from the nearest PlayerEpisodePanel context.
 * Renders nothing when outside an EpisodePanelContext (i.e. movie content).
 */
export function PlayerEpisodePanelTrigger() {
  const ctx = use(EpisodePanelContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={ctx.toggle}
      className={cn(
        'p-2.5 md:p-3 transition-all duration-200',
        'bg-white border-[3px] border-border text-foreground ',
        'hover:bg-background',
        'active:bg-[#e0e0e0]',
        ctx.isOpen && 'bg-background shadow-none',
      )}
      aria-label="Show episodes"
      title="Episodes"
    >
      <Library
        className={cn(
          'w-5 h-5 md:w-6 md:h-6 stroke-[3px] transition-transform duration-200',
          ctx.isOpen && 'scale-110',
        )}
      />
    </button>
  );
}
