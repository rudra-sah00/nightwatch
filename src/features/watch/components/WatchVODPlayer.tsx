import { SkipBack, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useState } from 'react';
import { useRemoteControlListener } from '@/features/remote-control/hooks/use-remote-control-listener';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import { useVODPlayerState } from '../hooks/use-vod-player-state';
import { Player, usePlayerContext } from '../player';
import type { VideoMetadata } from '../player/context/types';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';
import { NextEpisodeOverlay } from '../player/ui/overlays/NextEpisodeOverlay';

/**
 * Props for the {@link WatchVODPlayer} component.
 *
 * Configures the HLS stream source, video metadata, subtitle/audio tracks,
 * quality variants, and layout behaviour.
 */
interface WatchPlayerProps {
  /** HLS manifest URL for the VOD stream, or `null` while loading. */
  streamUrl: string | null;
  /** Title, poster, season/episode info used by overlays and Discord Rich Presence. */
  metadata: VideoMetadata;
  /** Single-file caption/subtitle URL (legacy path). */
  captionUrl?: string | null;
  /** Multi-track subtitle list rendered in the player's subtitle selector. */
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  /** Available quality variants for manual bitrate switching. */
  qualities?: { quality: string; url: string }[];
  /** WebVTT sprite sheet URL for seek-bar thumbnail previews. */
  spriteVtt?: string;
  /** Content description shown in the pause overlay. */
  description?: string;
  /** Callback to expose the underlying `<video>` element to the parent. */
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
  /** Custom header content rendered above the player on mobile inline layout. */
  mobileHeaderContent?: React.ReactNode;
  /** Whether the current user is authenticated (gates certain controls). */
  isAuthenticated?: boolean;
  /** Custom navigation handler; defaults to `router.replace`. */
  onNavigate?: (url: string) => void;
  /** Fired when the stream token expires so the parent can refresh it. */
  onStreamExpired?: () => void;
  /** Language dubs: seeded into the player so AudioSelector shows them */
  initialAudioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  /** Pre-selected track ID — highlights the currently-playing dub in AudioSelector on load */
  initialAudioTrackId?: string;
  /** Called when the user selects a language dub */
  onAudioTrackChange?: (trackId: string) => void;
  /** Hide the back button in the player header (e.g. public clip page) */
  hideBackButton?: boolean;
}

/**
 * VOD (Video-On-Demand) player component.
 *
 * The player is fixed full-viewport. It also:
 * - Updates Discord Rich Presence on Electron via `desktopBridge`.
 * - Broadcasts a `watch:set_activity` socket event so friends can see what
 *   the user is watching, cleared on unmount.
 *
 * @param props - {@link WatchPlayerProps}
 * @returns The memoised VOD player element.
 */
export const WatchVODPlayer = memo(function WatchVODPlayer(
  props: WatchPlayerProps,
) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/home');
    }
  }, [router]);

  useEffect(() => {
    if (checkIsDesktop()) {
      desktopBridge.updateDiscordPresence({
        details: `Watching: ${props.metadata.title}`,
        state:
          props.metadata.type === 'series'
            ? `Season ${props.metadata.season} Episode ${props.metadata.episode}`
            : props.metadata.year
              ? `Movie (${props.metadata.year})`
              : 'Feature Film',
        largeImageText: props.metadata.title,
        largeImageKey: 'nightwatch_logo',
        startTimestamp: Date.now(),
      });
      return () => desktopBridge.clearDiscordPresence();
    }
  }, [props.metadata]);

  return (
    <Player.Root
      {...props}
      containerStyle={{
        position: 'fixed',
        top: 'var(--electron-titlebar-height, 0px)',
        right: 0,
        bottom: 0,
        left: 0,
      }}
      streamMode="vod"
      allowPortraitPlayback={false}
      onBack={handleBack}
      onNavigate={props.onNavigate || ((url) => router.replace(url))}
    >
      <VODPlayerState hideBackButton={props.hideBackButton} />
    </Player.Root>
  );
});

/**
 * Internal state renderer for the VOD player.
 *
 * Consumes {@link useVODPlayerState} and renders the loading poster overlay,
 * buffering spinner, error overlay, center play button, control bar (with
 * desktop/mobile variants), episode panel, and next-episode auto-play overlay.
 *
 * @param props.hideBackButton - Hides the header back arrow (e.g. on public clip pages).
 */
function VODPlayerState({ hideBackButton }: { hideBackButton?: boolean }) {
  const { state, metadata, playerHandlers, nextEpisode, pauseOverlayMetadata } =
    useVODPlayerState();
  const t = useTranslations('watch.player');
  const { socket } = useSocket();

  // Remote control: advertise stream to mobile devices
  useRemoteControlListener({
    metadata,
    state,
    playerHandlers,
    onNextEpisode: metadata.type === 'series' ? nextEpisode.play : undefined,
  });

  // Broadcast VOD activity to friends with heartbeat while playing
  useEffect(() => {
    if (!socket?.connected) return;

    const emitActivity = () => {
      socket.emit('watch:set_activity', {
        type: metadata.type ?? 'movie',
        title: metadata.title,
        artist: null,
        season: metadata.season ?? null,
        episode: metadata.episode ?? null,
        episodeTitle: metadata.episodeTitle ?? null,
        posterUrl: metadata.posterUrl ?? null,
        secondaryPosterUrl: null,
      });
    };

    let intervalId: NodeJS.Timeout;

    if (state.isPlaying) {
      emitActivity();
      intervalId = setInterval(emitActivity, 3 * 60 * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, state.isPlaying, metadata]);

  // Always clear activity when navigating away / unmounting
  useEffect(() => {
    return () => {
      socket?.emit('watch:clear_activity');
    };
  }, [socket]);

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
          <LoadingOverlay
            isVisible={true}
            text={t('loading')}
            bgOpacity="bg-transparent"
          />
        </div>
      ) : null}

      <Player.Video />

      <DebouncedBufferingOverlay
        isVisible={state.isBuffering && !state.isLoading}
      />

      <ErrorOverlay
        isVisible={!!state.error && !state.isLoading && !state.isBuffering}
        message={state.error || t('errorDefault')}
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

      <Player.EpisodePanel>
        <Player.Controls>
          <Player.Header hideBackButton={hideBackButton} />
          {/* Mobile top-right: settings + fullscreen (YouTube-style) */}
          <Player.MobileTopBar>
            <Player.SettingsMenu />
          </Player.MobileTopBar>
          {/* Mobile center: skip back / play / skip forward (YouTube-style) */}
          <Player.MobileCenterControls>
            <MobileSkipBack />
            <Player.PlayPause size="lg" />
            <MobileSkipForward />
          </Player.MobileCenterControls>
          {/* Desktop layout: seekbar then control row */}
          <div className="hidden md:contents group-data-[mobile]:!hidden">
            <Player.SeekBar />
          </div>
          <Player.ControlRow>
            <Player.PlayPause />
            <Player.SkipButtons />
            <Player.Volume />
            <div className="hidden md:contents group-data-[mobile]:!hidden">
              <Player.TimeDisplay />
            </div>
            <Player.Spacer />
            <div className="hidden md:contents group-data-[mobile]:!hidden">
              <Player.EpisodePanelTrigger />
            </div>
            <div className="hidden md:contents group-data-[mobile]:!hidden">
              <Player.AudioSubtitleSelectors />
            </div>
            <Player.SettingsMenu />
            <div className="hidden md:contents group-data-[mobile]:!hidden">
              <Player.CastButton />
            </div>
            <Player.Fullscreen />
          </Player.ControlRow>
          {/* Mobile layout: fullscreen bottom-right, then seekbar pinned to bottom */}
          <Player.MobileBottomRight>
            <Player.Fullscreen />
          </Player.MobileBottomRight>
          <div className="md:hidden group-data-[mobile]:block">
            <Player.MobileSeekBar />
          </div>
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

/** Mobile-only skip-back button that seeks the video 10 seconds backwards. */
function MobileSkipBack() {
  const { playerHandlers } = usePlayerContext();
  return (
    <button
      type="button"
      onClick={() => playerHandlers.skip(-10)}
      className="p-3 transition-transform active:scale-90"
    >
      <SkipBack className="w-7 h-7 text-white fill-white" />
    </button>
  );
}

/** Mobile-only skip-forward button that seeks the video 10 seconds forwards. */
function MobileSkipForward() {
  const { playerHandlers } = usePlayerContext();
  return (
    <button
      type="button"
      onClick={() => playerHandlers.skip(10)}
      className="p-3 transition-transform active:scale-90"
    >
      <SkipForward className="w-7 h-7 text-white fill-white" />
    </button>
  );
}

/**
 * Debounced buffering overlay — prevents flash on quick seeks.
 * Only shows the spinner if buffering persists for 300ms+.
 */
function DebouncedBufferingOverlay({ isVisible }: { isVisible: boolean }) {
  const [debouncedVisible, setDebouncedVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDebouncedVisible(false);
      return;
    }
    const timer = setTimeout(() => setDebouncedVisible(true), 300);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return <BufferingOverlay isVisible={debouncedVisible} />;
}
