import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { useVODPlayerState } from '../hooks/use-vod-player-state';
import { Player } from '../player';
import type { VideoMetadata } from '../player/context/types';
import { useMobileDetection } from '../player/hooks/useMobileDetection';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';
import { NextEpisodeOverlay } from '../player/ui/overlays/NextEpisodeOverlay';

export interface WatchPlayerProps {
  streamUrl: string | null;
  metadata: VideoMetadata;
  captionUrl?: string | null;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  qualities?: { quality: string; url: string }[];
  spriteVtt?: string;
  description?: string;
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
  mobileHeaderContent?: React.ReactNode;
  mobileLayout?: 'immersive' | 'inline';
  isAuthenticated?: boolean;
  onNavigate?: (url: string) => void;
  onStreamExpired?: () => void;
  /** Server 2 language dubs: seeded into the player so AudioSelector shows them */
  initialAudioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  /** Pre-selected track ID — highlights the currently-playing dub in AudioSelector on load */
  initialAudioTrackId?: string;
  /** Called when the user selects a language dub on server 2 */
  onAudioTrackChange?: (trackId: string) => void;
}

export const WatchVODPlayer = memo(function WatchVODPlayer(
  props: WatchPlayerProps,
) {
  const router = useRouter();
  const isMobile = useMobileDetection();
  const useInlineMobileLayout =
    isMobile && (props.mobileLayout ?? 'inline') === 'inline';

  const mobileMetaText =
    props.metadata.type === 'series' &&
    props.metadata.season != null &&
    props.metadata.episode != null
      ? `S${props.metadata.season}:E${props.metadata.episode}${props.metadata.episodeTitle ? ` • ${props.metadata.episodeTitle}` : ''}`
      : props.metadata.year
        ? `Movie • ${props.metadata.year}`
        : 'Movie';

  // Handle going back
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  const mobileHeader = (
    <div className="relative z-50 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex md:hidden items-center gap-4 bg-black pointer-events-auto border-b border-white/5">
      <button
        type="button"
        onClick={handleBack}
        className="p-2 rounded-full bg-white/10/20 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-white truncate">
          {props.metadata.title}
        </h1>
        <p className="text-xs text-white/70 truncate">{mobileMetaText}</p>
      </div>
      {props.mobileHeaderContent}
    </div>
  );

  return (
    <>
      {useInlineMobileLayout ? mobileHeader : null}
      <Player.Root
        {...props}
        containerStyle={
          useInlineMobileLayout
            ? {
                position: 'relative',
                width: '100%',
                height: 'auto',
                aspectRatio: '16 / 9',
                maxHeight: '56.25vw',
              }
            : {
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }
        }
        streamMode="vod"
        allowPortraitPlayback={useInlineMobileLayout}
        onBack={handleBack}
        onNavigate={props.onNavigate || ((url) => router.replace(url))}
      >
        {!useInlineMobileLayout ? mobileHeader : null}
        <VODPlayerState />
      </Player.Root>
    </>
  );
});

function VODPlayerState() {
  const { state, metadata, playerHandlers, nextEpisode, pauseOverlayMetadata } =
    useVODPlayerState();

  return (
    <>
      {state.isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-1000">
          {metadata.posterUrl ? (
            <div className="absolute inset-0 z-0">
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-40"
                style={{ backgroundImage: `url(${metadata.posterUrl})` }}
              />
              <div className="absolute inset-0 backdrop-blur-[40px] bg-black/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
            </div>
          ) : null}
          <LoadingOverlay isVisible={true} />
        </div>
      ) : null}

      <Player.Video />

      <BufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

      <ErrorOverlay
        isVisible={!!state.error && !state.isLoading && !state.isBuffering}
        message={state.error || 'An error occurred'}
        onRetry={() => {
          window.location.reload();
        }}
        onBack={playerHandlers.goBack}
      />

      <CenterPlayButton
        isPlaying={state.isPlaying}
        onToggle={playerHandlers.togglePlay}
        metadata={pauseOverlayMetadata}
        disabled={false}
        isLoading={state.isLoading}
      />

      {/* Episode panel provider wraps controls for shared context */}
      <Player.EpisodePanel>
        <Player.Controls>
          <Player.Header />
          <Player.SeekBar />
          <Player.ControlRow>
            <Player.PlayPause />
            <Player.SkipButtons />
            <Player.Volume />
            <div className="hidden md:contents">
              <Player.TimeDisplay />
            </div>
            <Player.Spacer />
            <div className="hidden md:contents">
              <Player.EpisodePanelTrigger />
            </div>
            <div className="hidden md:contents">
              <Player.AudioSubtitleSelectors />
            </div>
            <Player.SettingsMenu />
            <Player.Fullscreen />
          </Player.ControlRow>
        </Player.Controls>

        {/* Episode overlay — renders OUTSIDE controls, covers entire player */}
        <Player.EpisodePanelOverlay />
      </Player.EpisodePanel>

      <NextEpisodeOverlay
        isVisible={nextEpisode.show}
        nextEpisode={nextEpisode.info}
        onPlayNext={nextEpisode.play}
        onCancel={nextEpisode.cancel}
        isLoading={nextEpisode.isLoading}
      />
    </>
  );
}
