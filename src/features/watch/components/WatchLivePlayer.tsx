'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useEffect, useRef, useState } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import { Player } from '../player';
import { usePlayerContext } from '../player/context/PlayerContext';
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
  const t = useTranslations('watch.player');
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
        largeImageKey: 'nightwatch_logo', // Safe fallback because discord-rpc drops invalid keys/urls
        startTimestamp: Date.now(),
      });
    }
  }, [props.metadata]);

  // Broadcast live activity to friends
  const { socket } = useSocket();
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!socket?.connected) return;
    const payload = {
      type: 'live',
      title: props.metadata.title,
      posterUrl: props.metadata.posterUrl ?? null,
    };
    socket.emit('watch:set_activity', payload);
    // Refresh every 45s to keep the activity alive (TTL is 60s)
    activityIntervalRef.current = setInterval(() => {
      socket.emit('watch:set_activity', payload);
    }, 45_000);
    return () => {
      if (activityIntervalRef.current)
        clearInterval(activityIntervalRef.current);
    };
  }, [socket, props.metadata.title, props.metadata.posterUrl]);

  const mobileHeader = (
    <div className="relative z-50 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex md:hidden items-center gap-4 bg-black pointer-events-auto border-b border-white/5">
      <button
        type="button"
        onClick={handleBack}
        aria-label={t('goBackAriaLabel')}
        className="p-2 rounded-full bg-neo-surface/10/20 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-white truncate">
          {props.metadata.title}
        </h1>
      </div>
      {props.mobileHeaderContent}
    </div>
  );

  return (
    <>
      {useInlineMobileLayout ? mobileHeader : null}
      <Player.Root
        {...props}
        skipProgressHistory={true}
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
        streamMode="live"
        allowPortraitPlayback={useInlineMobileLayout}
        onBack={handleBack}
        onNavigate={(url) => router.push(url)}
      >
        {!useInlineMobileLayout ? mobileHeader : null}

        <LivePlayerState streamUrl={props.streamUrl} />
      </Player.Root>
    </>
  );
});
function LivePlayerState({ streamUrl }: { streamUrl: string | null }) {
  const { state, playerHandlers, metadata } = usePlayerContext();
  const t = useTranslations('watch.player');
  const error = state.error;
  // Treat null streamUrl (waiting for live-bridge) as loading — prevents
  // the ErrorOverlay from flashing for a single frame before useHls runs.
  const isWaitingForStream = !streamUrl;
  const isLoading = state.isLoading || isWaitingForStream;

  return (
    <>
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-1000">
          <LoadingOverlay isVisible={true} />
        </div>
      ) : null}

      <Player.Video />

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

      <Player.Controls>
        <Player.Header />

        {/* DVR seek bar — scrub within the live buffer window */}
        <Player.SeekBar />

        {/* Bottom control row */}
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
      </Player.Controls>
    </>
  );
}
function LiveBufferingOverlay({ isVisible }: { isVisible: boolean }) {
  const [debouncedVisible, setDebouncedVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDebouncedVisible(false);
      return;
    }

    // Only show the spinner if we've been stalled for > 500ms.
    // This avoids 'flicker' for micro-buffering events that recover instantly.
    const timer = setTimeout(() => setDebouncedVisible(true), 500);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return <BufferingOverlay isVisible={debouncedVisible} />;
}
