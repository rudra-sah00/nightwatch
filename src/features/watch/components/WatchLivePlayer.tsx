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

interface WatchLivePlayerProps {
  streamUrl: string | null;
  metadata: VideoMetadata;
  mobileHeaderContent?: React.ReactNode;
  mobileLayout?: 'immersive' | 'inline';
}

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
            skipProgressHistory={true}
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
            streamMode="live"
            allowPortraitPlayback={useInlineMobileLayout}
            onBack={handleBack}
            onNavigate={(url) => router.push(url)}
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
            <LivePlayerState streamUrl={props.streamUrl} isPip={isPip} />
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

function LivePlayerState({
  streamUrl,
  isPip,
}: {
  streamUrl: string | null;
  isPip?: boolean;
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
            <Player.PipButton
              onPip={() => {
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: 'smooth',
                });
              }}
            />
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
