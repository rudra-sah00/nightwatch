import { SkipBack, SkipForward } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRemoteControlListener } from '@/features/remote-control/hooks/use-remote-control-listener';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { usePipContext } from '@/providers/pip-provider';
import { useSocket } from '@/providers/socket-provider';
import { useVODPlayerState } from '../hooks/use-vod-player-state';
import { Player, usePlayerContext } from '../player';
import type { VideoMetadata } from '../player/context/types';
import { useMobileDetection } from '../player/hooks/useMobileDetection';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';
import { NextEpisodeOverlay } from '../player/ui/overlays/NextEpisodeOverlay';

/**
 * Props for the {@link WatchVODPlayer} component.
 *
 * Configures the HLS stream source, video metadata, subtitle/audio tracks,
 * quality variants, and mobile layout behaviour (inline vs immersive).
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
  /**
   * Mobile layout mode.
   * - `'inline'` (default): player sits in the page flow and enters a floating
   *   PiP mini-player when scrolled out of view via IntersectionObserver.
   * - `'immersive'`: player fills the viewport (no scroll-based PiP).
   */
  mobileLayout?: 'immersive' | 'inline';
  /** Whether the current user is authenticated (gates certain controls). */
  isAuthenticated?: boolean;
  /** Custom navigation handler; defaults to `router.replace`. */
  onNavigate?: (url: string) => void;
  /** Fired when the stream token expires so the parent can refresh it. */
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
  /** Hide the back button in the player header (e.g. public clip page) */
  hideBackButton?: boolean;
}

/**
 * VOD (Video-On-Demand) player component with two layout strategies:
 *
 * **Desktop / immersive mobile** — the player is fixed full-viewport.
 *
 * **Inline mobile** — the player sits in the normal document flow inside a
 * 16:9 sentinel `<div>`. An `IntersectionObserver` watches the sentinel; when
 * it scrolls out of view (< 50 % visible) the player transitions to a fixed
 * mini-player (PiP) in the bottom-right corner with a smooth
 * `cubic-bezier(0.4, 0, 0.2, 1)` CSS transition. The mini-player supports:
 *
 * - **Tap to dismiss** — scrolls back to the top and restores inline mode.
 * - **Swipe-to-dismiss** — horizontal touch gestures beyond 80 px trigger a
 *   slide-out animation (opacity fade + translateX) then navigate back.
 *
 * The component also:
 * - Updates Discord Rich Presence on Electron via `desktopBridge`.
 * - Broadcasts a `watch:set_activity` socket event so friends can see what
 *   the user is watching, cleared on unmount.
 * - Registers with the global {@link PipProvider} so cross-route PiP works.
 *
 * @param props - {@link WatchPlayerProps}
 * @returns The memoised VOD player element.
 */
export const WatchVODPlayer = memo(function WatchVODPlayer(
  props: WatchPlayerProps,
) {
  const router = useRouter();
  const isMobile = useMobileDetection();
  const useInlineMobileLayout =
    isMobile && (props.mobileLayout ?? 'inline') === 'inline';

  // Handle going back
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/home');
    }
  };

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
        largeImageKey: 'nightwatch_logo', // Safe fallback, external URLs usually break discord-rpc
        startTimestamp: Date.now(),
      });
      return () => desktopBridge.clearDiscordPresence();
    }
  }, [props.metadata]);

  // Activity tracking is handled inside VODPlayerState where play/pause state is available

  // Ref for IntersectionObserver-based in-app PiP on mobile
  const playerSentinelRef = useRef<HTMLDivElement>(null);
  const [isPip, setIsPip] = useState(false);

  useEffect(() => {
    if (!useInlineMobileLayout) return;
    const sentinel = playerSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsPip(!entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [useInlineMobileLayout]);

  const dismissPip = useCallback(() => {
    setIsPip(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const pipStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
    right: '0.75rem',
    width: '60vw',
    height: 'auto',
    aspectRatio: '16 / 9',
    zIndex: 9998,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const inlineStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const pipSwipeRef = useRef(0);
  const [pipSwipeX, setPipSwipeX] = useState(0);
  const [pipDismissing, setPipDismissing] = useState(false);
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const handlePipSwipeEnd = useCallback(() => {
    if (Math.abs(pipSwipeX) > 80) {
      setPipDismissing(true);
      setPipSwipeX(pipSwipeX > 0 ? 300 : -300);
      setTimeout(() => {
        handleBackRef.current();
      }, 250);
    } else {
      setPipSwipeX(0);
    }
  }, [pipSwipeX]);

  return (
    <>
      {useInlineMobileLayout ? (
        <div
          ref={playerSentinelRef}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            maxHeight: '56.25vw',
            position: 'relative',
            background: '#000',
          }}
        >
          <Player.Root
            {...props}
            containerStyle={{
              ...(isPip ? pipStyle : inlineStyle),
              ...(isPip && pipSwipeX !== 0
                ? {
                    transform: `translateX(${pipSwipeX}px)`,
                    opacity: pipDismissing ? 0 : 1 - Math.abs(pipSwipeX) / 400,
                    transition: pipDismissing
                      ? 'transform 0.25s ease-out, opacity 0.25s ease-out'
                      : 'none',
                  }
                : {}),
            }}
            streamMode="vod"
            allowPortraitPlayback={useInlineMobileLayout}
            onBack={handleBack}
            onNavigate={props.onNavigate || ((url) => router.replace(url))}
          >
            {isPip ? (
              <button
                type="button"
                onClick={dismissPip}
                onTouchStart={(e) => {
                  pipSwipeRef.current = e.touches[0].clientX;
                }}
                onTouchMove={(e) => {
                  setPipSwipeX(e.touches[0].clientX - pipSwipeRef.current);
                }}
                onTouchEnd={handlePipSwipeEnd}
                className="absolute inset-0 z-[60]"
                aria-label="Back to player"
              />
            ) : null}
            <PipRegistrar
              streamUrl={props.streamUrl}
              metadata={props.metadata}
            />
            <VODPlayerState
              hideBackButton={props.hideBackButton}
              isPip={isPip}
              onPip={handleBack}
            />
          </Player.Root>
        </div>
      ) : (
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
          <PipRegistrar streamUrl={props.streamUrl} metadata={props.metadata} />
          <VODPlayerState hideBackButton={props.hideBackButton} isPip={false} />
        </Player.Root>
      )}
    </>
  );
});

/**
 * Internal state renderer for the VOD player.
 *
 * Consumes {@link useVODPlayerState} and renders the loading poster overlay,
 * buffering spinner, error overlay, center play button, control bar (with
 * desktop/mobile variants), episode panel, and next-episode auto-play overlay.
 * All overlays are hidden when the player is in PiP mode to keep the
 * mini-player uncluttered.
 *
 * @param props.hideBackButton - Hides the header back arrow (e.g. on public clip pages).
 * @param props.isPip - Whether the player is currently in the inline mobile PiP state.
 * @param props.onPip - Callback invoked when the user taps the PiP exit button.
 */
function VODPlayerState({
  hideBackButton,
  isPip,
  onPip,
}: {
  hideBackButton?: boolean;
  isPip?: boolean;
  onPip?: () => void;
}) {
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
      // Emit immediately on play
      emitActivity();
      // Heartbeat every 3 minutes to keep the 5-min Redis TTL alive
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
      {!isPip && state.isLoading ? (
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

      {isPip ? null : (
        <>
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
        </>
      )}

      {isPip ? null : (
        <Player.EpisodePanel>
          <Player.Controls>
            <Player.Header hideBackButton={hideBackButton} />
            {/* Mobile top-right: settings + fullscreen (YouTube-style) */}
            <Player.MobileTopBar>
              <Player.PipButton
                onPip={() => {
                  if (onPip) onPip();
                }}
              />
              <Player.SettingsMenu />
            </Player.MobileTopBar>
            {/* Mobile center: skip back / play / skip forward (YouTube-style) */}
            <Player.MobileCenterControls>
              <MobileSkipBack />
              <Player.PlayPause size="lg" />
              <MobileSkipForward />
            </Player.MobileCenterControls>
            {/* Desktop layout: seekbar then control row */}
            <div className="hidden md:contents">
              <Player.SeekBar />
            </div>
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
              <div className="hidden md:contents">
                <Player.CastButton />
              </div>
              <Player.Fullscreen />
            </Player.ControlRow>
            {/* Mobile layout: fullscreen bottom-right, then seekbar pinned to bottom */}
            <Player.MobileBottomRight>
              <Player.Fullscreen />
            </Player.MobileBottomRight>
            <div className="md:hidden">
              <Player.MobileSeekBar />
            </div>
          </Player.Controls>

          {/* Episode overlay — renders OUTSIDE controls, covers entire player */}
          <Player.EpisodePanelOverlay />
        </Player.EpisodePanel>
      )}

      {isPip ? null : (
        <NextEpisodeOverlay
          isVisible={nextEpisode.show}
          nextEpisode={nextEpisode.info}
          onPlayNext={nextEpisode.play}
          onCancel={nextEpisode.cancel}
          isLoading={nextEpisode.isLoading}
        />
      )}
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

/** Registers the current video element with the global PiP provider so it can
 *  be captured when the user navigates away from the watch route. */
function PipRegistrar({
  streamUrl,
  metadata,
}: {
  streamUrl: string | null;
  metadata: VideoMetadata;
}) {
  const { videoRef } = usePlayerContext();
  const pip = usePipContext();
  const pathname = usePathname();

  useEffect(() => {
    if (!pip || !streamUrl) return;
    pip.register(
      { streamUrl, watchUrl: pathname, title: metadata.title },
      videoRef.current!,
    );
    return () => pip.unregister();
  }, [pip, streamUrl, pathname, metadata.title, videoRef]);

  return null;
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
