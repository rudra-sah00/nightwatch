import { SkipBack, SkipForward } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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

interface WatchPlayerProps {
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
  /** Hide the back button in the player header (e.g. public clip page) */
  hideBackButton?: boolean;
}

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

  // Broadcast VOD activity to friends (set once, clear on unmount)
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('watch:set_activity', {
      type: props.metadata.type ?? 'movie',
      title: props.metadata.title,
      season: props.metadata.season ?? null,
      episode: props.metadata.episode ?? null,
      episodeTitle: props.metadata.episodeTitle ?? null,
      posterUrl: props.metadata.posterUrl ?? null,
    });
    return () => {
      socket.emit('watch:clear_activity');
    };
  }, [socket, props.metadata]);

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
    playerSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const pipStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
    right: '0.75rem',
    width: '45vw',
    height: 'auto',
    aspectRatio: '16 / 9',
    zIndex: 9998,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  };

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
          }}
        >
          <Player.Root
            {...props}
            containerStyle={
              isPip
                ? pipStyle
                : {
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }
            }
            streamMode="vod"
            allowPortraitPlayback={useInlineMobileLayout}
            onBack={handleBack}
            onNavigate={props.onNavigate || ((url) => router.replace(url))}
          >
            {isPip ? (
              <button
                type="button"
                onClick={dismissPip}
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
              onPip={() => setIsPip(true)}
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
          <BufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

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
    if (!pip || !streamUrl || !videoRef.current) return;
    pip.register(
      { streamUrl, watchUrl: pathname, title: metadata.title },
      videoRef.current,
    );
    return () => pip.unregister();
  }, [pip, streamUrl, pathname, metadata.title, videoRef]);

  return null;
}
