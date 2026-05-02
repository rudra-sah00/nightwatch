'use client';
import { SkipBack, SkipForward } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RecordButton } from '@/features/clips/components/RecordButton';
import { useClipRecorder } from '@/features/clips/hooks/use-clip-recorder';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { usePipContext } from '@/providers/pip-provider';
import { useSocket } from '@/providers/socket-provider';
import { Player, usePlayerContext } from '../player';
import type { VideoMetadata } from '../player/context/types';
import { useMobileDetection } from '../player/hooks/useMobileDetection';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';

/**
 * Props for the {@link WatchLivePlayer} component.
 */
interface WatchLivePlayerProps {
  /** HLS live manifest URL, or `null` while the stream is not yet available. */
  streamUrl: string | null;
  /** Metadata (title, poster) used by overlays and Discord Rich Presence. */
  metadata: VideoMetadata;
  /** Custom header content rendered above the player on mobile. */
  mobileHeaderContent?: React.ReactNode;
  /**
   * Mobile layout mode.
   * - `'inline'`: player sits in the page flow with scroll-based PiP.
   * - `'immersive'` (default): player fills the viewport.
   */
  mobileLayout?: 'immersive' | 'inline';
}

/**
 * Live-stream player component with clip recording and the same dual-layout
 * PiP system as {@link WatchVODPlayer}.
 *
 * **Inline mobile PiP** — uses an `IntersectionObserver` on a sentinel div;
 * when the sentinel scrolls out of view the player transitions to a fixed
 * mini-player with swipe-to-dismiss (same 80 px threshold and slide-out
 * animation as the VOD player).
 *
 * **Clip recording** — the header renders a {@link RecordButton} powered by
 * {@link useClipRecorder}. Starting/stopping a recording shows toast
 * notifications; clips are processed server-side via FFmpeg.
 *
 * Also updates Discord Rich Presence and broadcasts `watch:set_activity`
 * (type `'live'`) over the socket for friend activity feeds.
 *
 * @param props - {@link WatchLivePlayerProps}
 * @returns The memoised live player element.
 */
export const WatchLivePlayer = memo(function WatchLivePlayer(
  props: WatchLivePlayerProps,
) {
  const router = useRouter();
  const isMobile = useMobileDetection();
  const useInlineMobileLayout = isMobile && props.mobileLayout === 'inline';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/live');
    }
  };

  useEffect(() => {
    if (checkIsDesktop()) {
      desktopBridge.updateDiscordPresence({
        details: `Watching Live: ${props.metadata.title}`,
        state: 'Live Stream',
        largeImageText: props.metadata.title,
        largeImageKey: 'nightwatch_logo',
        startTimestamp: Date.now(),
      });
      return () => desktopBridge.clearDiscordPresence();
    }
  }, [props.metadata]);

  const { socket } = useSocket();
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('watch:set_activity', {
      type: 'live',
      title: props.metadata.title,
      posterUrl: props.metadata.posterUrl ?? null,
    });
    return () => {
      socket.emit('watch:clear_activity');
    };
  }, [socket, props.metadata.title, props.metadata.posterUrl]);

  // Local scroll-based PiP
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
            skipProgressHistory={true}
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
            streamMode="live"
            allowPortraitPlayback={useInlineMobileLayout}
            onBack={handleBack}
            onNavigate={(url) => router.push(url)}
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
            <LivePlayerState
              streamUrl={props.streamUrl}
              isPip={isPip}
              onPip={handleBack}
            />
          </Player.Root>
        </div>
      ) : (
        <Player.Root
          {...props}
          skipProgressHistory={true}
          containerStyle={{
            position: 'fixed',
            top: 'var(--electron-titlebar-height, 0px)',
            right: 0,
            bottom: 0,
            left: 0,
          }}
          streamMode="live"
          allowPortraitPlayback={false}
          onBack={handleBack}
          onNavigate={(url) => router.push(url)}
        >
          <PipRegistrar streamUrl={props.streamUrl} metadata={props.metadata} />
          <LivePlayerState streamUrl={props.streamUrl} isPip={false} />
        </Player.Root>
      )}
    </>
  );
});

/**
 * Internal state renderer for the live player.
 *
 * Renders loading/buffering/error overlays, the center play button, the clip
 * {@link RecordButton} in the header, and the control bar with a live badge
 * and DVR seek bar. All overlays are suppressed in PiP mode.
 *
 * Uses {@link LiveBufferingOverlay} which debounces the buffering indicator
 * by 500 ms to avoid flicker on brief stalls.
 *
 * @param props.streamUrl - Current HLS URL (used by the clip recorder).
 * @param props.isPip - Whether the player is in inline mobile PiP mode.
 * @param props.onPip - Callback when the user taps the PiP exit button.
 */
function LivePlayerState({
  streamUrl,
  isPip,
  onPip,
}: {
  streamUrl: string | null;
  isPip?: boolean;
  onPip?: () => void;
}) {
  const { state, playerHandlers, metadata } = usePlayerContext();
  const t = useTranslations('watch.player');
  const error = state.error;
  const isWaitingForStream = !streamUrl;
  const isLoading = state.isLoading || isWaitingForStream;

  const clip = useClipRecorder({
    matchId: metadata.movieId,
    title: `${metadata.title} - Clip`,
    streamUrl,
  });

  const handleStart = () => {
    clip.start();
    toast.info('Recording started');
  };

  const handleStop = async () => {
    await clip.stop();
    toast.success('Clip saved! Processing...');
  };

  const recordButton = (
    <RecordButton
      isRecording={clip.isRecording}
      duration={clip.duration}
      canStop={clip.canStop}
      isStarting={clip.isStarting}
      isStopping={clip.isStopping}
      onStart={handleStart}
      onStop={handleStop}
    />
  );

  return (
    <>
      {!isPip && isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-1000">
          <LoadingOverlay isVisible={true} />
        </div>
      ) : null}

      <Player.Video />

      {isPip ? null : (
        <>
          <CenterPlayButton
            isPlaying={state.isPlaying}
            onToggle={playerHandlers.togglePlay}
            metadata={metadata}
            disabled={false}
            isLoading={isLoading}
          />

          <LiveBufferingOverlay isVisible={state.isBuffering && !isLoading} />

          <ErrorOverlay
            isVisible={!!error && !isLoading && !state.isBuffering}
            message={error || t('liveUnavailable')}
            onRetry={() => {
              window.location.reload();
            }}
            onBack={playerHandlers.goBack}
          />
        </>
      )}

      {isPip ? null : (
        <Player.Controls>
          <Player.Header rightContent={recordButton} />
          {/* Mobile top: PiP left, settings right */}
          <Player.MobileTopBar>
            <Player.PipButton onPip={() => onPip?.()} />
            <Player.SettingsMenu />
          </Player.MobileTopBar>
          {/* Mobile center: skip back / play / skip forward */}
          <Player.MobileCenterControls>
            <MobileSkipBack />
            <Player.PlayPause size="lg" />
            <MobileSkipForward />
          </Player.MobileCenterControls>
          {/* Desktop: DVR seek bar */}
          <div className="hidden md:contents">
            <Player.SeekBar />
          </div>
          <Player.ControlRow>
            <Player.PlayPause />
            <Player.Volume />
            <Player.LiveBadge />
            <Player.Spacer />
            <div className="hidden min-[380px]:contents md:contents">
              <Player.SettingsMenu />
            </div>
            <Player.Fullscreen />
          </Player.ControlRow>
          {/* Mobile: fullscreen bottom-right, then seekbar */}
          <Player.MobileBottomRight>
            <Player.Fullscreen />
          </Player.MobileBottomRight>
          <div className="md:hidden">
            <Player.MobileSeekBar />
          </div>
        </Player.Controls>
      )}
    </>
  );
}

/** Mobile-only skip-back button that seeks the live DVR buffer 10 seconds backwards. */
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

/** Mobile-only skip-forward button that seeks the live DVR buffer 10 seconds forwards. */
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
 * Registers the current live video element with the global {@link PipProvider}
 * so cross-route PiP can activate when the user navigates away.
 *
 * @param props.streamUrl - Current HLS live manifest URL.
 * @param props.metadata - Video metadata (title used in the PiP overlay).
 */
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
  }, [pip, streamUrl, pathname, metadata.title, videoRef]);

  return null;
}

/**
 * Debounced buffering overlay for live streams.
 *
 * Delays showing the buffering spinner by 500 ms to prevent flicker during
 * brief network stalls that are common with live HLS segments.
 *
 * @param props.isVisible - Raw buffering state from the player.
 */
function LiveBufferingOverlay({ isVisible }: { isVisible: boolean }) {
  const [debouncedVisible, setDebouncedVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDebouncedVisible(false);
      return;
    }
    const timer = setTimeout(() => setDebouncedVisible(true), 500);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return <BufferingOverlay isVisible={debouncedVisible} />;
}
