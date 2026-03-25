'use client';

import dynamic from 'next/dynamic';
import { Player } from '@/features/watch/player';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import { CenterPlayButton } from '@/features/watch/player/ui/controls/PlayPause';
import { NextEpisodeOverlay } from '@/features/watch/player/ui/overlays/NextEpisodeOverlay';
import { useAuth } from '@/providers/auth-provider';
import { usePlayerOverlays } from '../hooks/use-player-overlays';
import { useWatchPartyVideoArea } from '../hooks/use-watch-party-video-area';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
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

const EmojiReactions = dynamic(
  () =>
    import('../interactions/components/EmojiReactions').then(
      (mod) => mod.EmojiReactions,
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
  const { metadata, playerHandlers } = usePlayerContext();

  const pauseOverlayMetadata = {
    title: metadata.title,
    type: metadata.type,
    season: metadata.season,
    episode: metadata.episode,
    description: metadata.description,
    year: metadata.year,
    posterUrl: metadata.posterUrl,
  };

  return (
    <>
      {state.isBuffering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-xs font-medium tracking-wide select-none">
            {isHost ? 'Buffering\u2026' : 'Syncing stream\u2026'}
          </p>
        </div>
      )}
      {state.error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 gap-3">
          <p className="text-white text-sm font-medium">{state.error}</p>
        </div>
      )}

      <CenterPlayButton
        isPlaying={state.isPlaying}
        onToggle={playerHandlers.togglePlay}
        metadata={pauseOverlayMetadata}
        disabled={!isHost}
        isLoading={state.isLoading}
      />

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
  isSidebarOpen: boolean;
  toggleFullscreen: () => Promise<void>;
  /** Host-only: called when next episode should start for the whole party */
  onNextEpisode?: (season: number, episode: number) => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  userId?: string;
  currentUserName?: string;
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
  isSidebarOpen,
  toggleFullscreen,
  onNextEpisode,
  rtmSendMessage,
  rtmSendMessageToPeer,
  userId,
  currentUserName,
}: WatchPartyVideoAreaProps) {
  const {
    metadata,
    streamUrlOverride,
    initialAudioTracks,
    initialAudioTrackId,
    handleAudioTrackChange,
  } = useWatchPartyVideoArea(room);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <Player.Root
      streamUrl={streamUrlOverride || room.streamUrl || null}
      metadata={metadata}
      captionUrl={room.captionUrl || null}
      subtitleTracks={room.subtitleTracks}
      spriteVtt={room.spriteVtt}
      qualities={room.qualities}
      onVideoRef={onVideoRef}
      readOnly={!isHost}
      isHost={isHost}
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      fullscreenToggleOverride={toggleFullscreen}
      isFullscreenOverride={isFullscreen}
      isLive={room.type === 'livestream'}
      initialAudioTracks={
        initialAudioTracks.length > 0 ? initialAudioTracks : undefined
      }
      initialAudioTrackId={initialAudioTrackId}
      onAudioTrackChange={isHost ? handleAudioTrackChange : undefined}
      playbackRate={room.state.playbackRate}
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
      <SketchOverlay
        rtmSendMessage={rtmSendMessage}
        rtmSendMessageToPeer={rtmSendMessageToPeer}
        userId={userId}
        userName={currentUserName}
      />

      {/* Episode panel provider wraps controls for shared context */}
      {!isSketchMode && (
        <Player.EpisodePanel>
          <Player.Controls>
            <Player.Header
              onSidebarToggle={onSidebarToggle}
              isSidebarOpen={isSidebarOpen}
              hideBackButton
            />
            <Player.SeekBar />
            <Player.ControlRow>
              <Player.PlayPause />
              <Player.Volume />
              <Player.TimeDisplay />
              <Player.Spacer />
              <EmojiReactions
                rtmSendMessage={rtmSendMessage}
                userId={userId}
                userName={
                  currentUserName ||
                  user?.name ||
                  (isHost ? 'Room Host' : 'Member')
                }
              />
              <Player.Spacer />
              <Player.EpisodePanelTrigger />
              <Player.AudioSubtitleSelectors />
              <Player.SettingsMenu />
              <Player.Fullscreen
                label={
                  isFullscreen ? 'Exit theater mode' : 'Enter theater mode'
                }
              />
            </Player.ControlRow>
          </Player.Controls>

          {/* Episode overlay — renders OUTSIDE controls, covers entire player */}
          <Player.EpisodePanelOverlay />
        </Player.EpisodePanel>
      )}
    </Player.Root>
  );
}
