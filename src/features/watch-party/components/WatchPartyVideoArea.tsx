'use client';

import dynamic from 'next/dynamic';
import { Player } from '@/features/watch/player';
import { NextEpisodeOverlay } from '@/features/watch/player/ui/overlays/NextEpisodeOverlay';
import { usePlayerOverlays } from '../hooks/use-player-overlays';
import { useWatchPartyVideoArea } from '../hooks/use-watch-party-video-area';
import type { WatchPartyRoom } from '../room/types';

const FloatingEmojis = dynamic(
  () =>
    import('../interactions/components/FloatingEmojis').then(
      (mod) => mod.FloatingEmojis,
    ),
  { ssr: false },
);

const SketchOverlay = dynamic(
  () =>
    import('../interactions/components/SketchOverlay').then(
      (mod) => mod.SketchOverlay,
    ),
  { ssr: false },
);

/**
 * Inner component that reads player state from context.
 * Must be rendered inside <Player.Root>.
 */
function PlayerOverlays({
  isHost,
  onNextEpisode,
}: {
  isHost: boolean;
  onNextEpisode?: (season: number, episode: number) => void;
}) {
  const { state, nextEpisode, handlePlayNext } = usePlayerOverlays(
    isHost,
    onNextEpisode,
  );

  return (
    <>
      {state.isBuffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}
      {state.error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 gap-3">
          <p className="text-white text-sm font-medium">{state.error}</p>
        </div>
      )}
      {/* Next episode overlay — host triggers party content update; guests see it read-only */}
      <NextEpisodeOverlay
        isVisible={nextEpisode.show}
        nextEpisode={nextEpisode.info}
        onPlayNext={handlePlayNext}
        onCancel={nextEpisode.cancel}
        isLoading={nextEpisode.isLoading}
      />
    </>
  );
}

interface WatchPartyVideoAreaProps {
  room: WatchPartyRoom;
  isHost: boolean;
  isFullscreen: boolean;
  isSketchMode: boolean;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onNavigate: (url: string) => void;
  onSidebarToggle: () => void;
  toggleFullscreen: () => Promise<void>;
  /** Host-only: called when next episode should start for the whole party */
  onNextEpisode?: (season: number, episode: number) => void;
}

/**
 * The video column of the Watch Party layout.
 * Composes Player.Root, overlays, sketch canvas, floating emojis,
 * and the player controls. Isolated from sidebar and dialog logic.
 */
export function WatchPartyVideoArea({
  room,
  isHost,
  isFullscreen,
  isSketchMode,
  onVideoRef,
  onNavigate,
  onSidebarToggle,
  toggleFullscreen,
  onNextEpisode,
}: WatchPartyVideoAreaProps) {
  const { metadata } = useWatchPartyVideoArea(room);

  return (
    <Player.Root
      streamUrl={room.streamUrl || null}
      metadata={metadata}
      captionUrl={room.captionUrl || null}
      subtitleTracks={room.subtitleTracks}
      spriteVtt={room.spriteVtt}
      onVideoRef={onVideoRef}
      readOnly={!isHost}
      onNavigate={onNavigate}
      fullscreenToggleOverride={toggleFullscreen}
      isFullscreenOverride={isFullscreen}
    >
      {/* Blurred poster background */}
      {metadata.posterUrl ? (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30"
            style={{ backgroundImage: `url(${metadata.posterUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
        </div>
      ) : null}

      <Player.Video />

      {/* State-driven overlays + next episode */}
      <PlayerOverlays isHost={isHost} onNextEpisode={onNextEpisode} />

      {/* Watch party overlays */}
      <FloatingEmojis />
      <SketchOverlay />

      {/* Player controls — hidden in sketch mode */}
      {!isSketchMode && (
        <Player.Controls>
          <Player.Header onSidebarToggle={onSidebarToggle} />
          <Player.SeekBar />
          <Player.ControlRow>
            <Player.PlayPause />
            <Player.Volume />
            <Player.TimeDisplay />
            <Player.Spacer />
            <Player.AudioSubtitleSelectors />
            <Player.SettingsMenu />
            <Player.Fullscreen
              label={isFullscreen ? 'Exit theater mode' : 'Enter theater mode'}
            />
          </Player.ControlRow>
        </Player.Controls>
      )}
    </Player.Root>
  );
}
