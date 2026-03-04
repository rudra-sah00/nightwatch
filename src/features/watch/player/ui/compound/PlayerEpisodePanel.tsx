'use client';

import { Library } from 'lucide-react';
import type React from 'react';
import { useCallback } from 'react';
import { playVideo } from '@/features/search/api';
import type { Episode } from '@/features/search/types';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { EpisodePanel } from '../controls/EpisodePanel';
import { useEpisodePanel } from '../controls/use-episode-panel';

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
    async (episode: Episode) => {
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
      });

      try {
        const response = await playVideo({
          type: 'series',
          title: metadata.title,
          seriesId,
          season: episode.seasonNumber ?? selectedSeason,
          episode: episode.episodeNumber,
          server: metadata.providerId,
        });

        if (response.success && response.masterPlaylistUrl) {
          params.set('stream', encodeURIComponent(response.masterPlaylistUrl));
          if (response.captionSrt) {
            params.set('caption', encodeURIComponent(response.captionSrt));
          }
          if (response.spriteVtt) {
            params.set('sprite', encodeURIComponent(response.spriteVtt));
          }
          if (response.qualities?.length) {
            params.set(
              'qualities',
              encodeURIComponent(JSON.stringify(response.qualities)),
            );
          }
          if (episode.title) {
            params.set('episodeTitle', episode.title);
          }
        }
      } catch {
        // watch page will refetchStream on mount
      }

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
        'rounded-full flex items-center justify-center',
        'transition-[colors,transform] duration-300 ease-out',
        ctx.isOpen
          ? 'bg-white/20 border-white/30'
          : 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/20',
        'backdrop-blur-sm border',
        'hover:scale-105 active:scale-95 active:bg-white/20',
        'shadow-lg shadow-black/20',
        'w-10 h-10 md:w-11 md:h-11',
      )}
      aria-label="Show episodes"
      title="Episodes"
    >
      <Library className="w-4 h-4 md:w-5 md:h-5 text-white" />
    </button>
  );
}
