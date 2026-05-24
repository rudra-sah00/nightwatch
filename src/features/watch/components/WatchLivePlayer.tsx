'use client';
import { ArrowLeft, SkipBack, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RecordButton } from '@/features/clips/components/RecordButton';
import { useClipRecorder } from '@/features/clips/hooks/use-clip-recorder';
import { useRemoteControlListener } from '@/features/remote-control/hooks/use-remote-control-listener';
import {
  checkIsDesktop,
  checkIsMobile,
  desktopBridge,
} from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import { Player, usePlayerContext } from '../player';
import type { VideoMetadata } from '../player/context/types';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';
import { extractTokenFromUrl } from '../utils';

/**
 * Props for the {@link WatchLivePlayer} component.
 */
interface WatchLivePlayerProps {
  /** HLS live manifest URL, or `null` while the stream is not yet available. */
  streamUrl: string | null;
  /** Metadata (title, poster) used by overlays and Discord Rich Presence. */
  metadata: VideoMetadata;
  /** Second team/channel logo for match activity cards. */
  secondaryPosterUrl?: string | null;
  /** Custom header content rendered above the player on mobile. */
  mobileHeaderContent?: React.ReactNode;
}

/**
 * Live-stream player component with clip recording.
 *
 * The player is fixed full-viewport.
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

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/live');
    }
  }, [router]);

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

  return (
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
      onBack={handleBack}
      onNavigate={(url) => router.push(url)}
    >
      <LivePlayerState streamUrl={props.streamUrl} />
    </Player.Root>
  );
});

/**
 * Internal state renderer for the live player.
 *
 * Renders loading/buffering/error overlays, the center play button, the clip
 * {@link RecordButton} in the header, and the control bar with a live badge
 * and DVR seek bar.
 *
 * Uses {@link LiveBufferingOverlay} which debounces the buffering indicator
 * by 500 ms to avoid flicker on brief stalls.
 *
 * @param props.streamUrl - Current HLS URL (used by the clip recorder).
 */
function LivePlayerState({ streamUrl }: { streamUrl: string | null }) {
  const { state, playerHandlers, metadata } = usePlayerContext();
  const t = useTranslations('watch.player');
  const error = state.error;
  const isWaitingForStream = !streamUrl;
  const isLoading = state.isLoading || isWaitingForStream;
  const { socket } = useSocket();

  // Remote control: advertise livestream to mobile devices
  useRemoteControlListener({ metadata, state, playerHandlers });

  // Broadcast Live activity to friends with heartbeat while playing
  useEffect(() => {
    if (!socket?.connected) return;

    const emitActivity = () => {
      socket.emit('watch:set_activity', {
        type: 'live',
        title: metadata.title,
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl: metadata.posterUrl ?? null,
        secondaryPosterUrl: metadata.secondaryPosterUrl ?? null,
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

  const clip = useClipRecorder({
    matchId: metadata.movieId,
    title: `${metadata.title} - Clip`,
    streamToken: extractTokenFromUrl(streamUrl),
    streamUrl,
  });

  const tc = useTranslations('common');

  const handleStart = () => {
    clip.start();
    toast.info(tc('recording.started'));
  };

  const handleStop = async () => {
    await clip.stop();
    toast.success(tc('recording.saved'));
  };

  const recordButton = checkIsMobile() ? null : (
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
        <Player.Header rightContent={recordButton} />
        {/* Mobile top: back left, settings right */}
        <Player.MobileTopBar>
          <MobileLiveBackButton />
          <Player.SettingsMenu />
        </Player.MobileTopBar>
        {/* Mobile center: skip back / play / skip forward */}
        <Player.MobileCenterControls>
          <MobileSkipBack />
          <Player.PlayPause size="lg" />
          <MobileSkipForward />
        </Player.MobileCenterControls>
        {/* Desktop: DVR seek bar */}
        <div className="hidden md:contents group-data-[mobile]:!hidden">
          <Player.SeekBar />
        </div>
        <Player.ControlRow>
          <Player.PlayPause />
          <Player.Volume />
          <Player.LiveBadge />
          <Player.Spacer />
          <div className="hidden min-[380px]:contents md:contents group-data-[mobile]:!hidden">
            <Player.SettingsMenu />
          </div>
          <div className="hidden md:contents group-data-[mobile]:!hidden">
            <Player.CastButton />
          </div>
          <Player.Fullscreen />
        </Player.ControlRow>
        {/* Mobile: fullscreen bottom-right, then seekbar */}
        <Player.MobileBottomRight>
          <Player.Fullscreen />
        </Player.MobileBottomRight>
        <div className="md:hidden group-data-[mobile]:block">
          <Player.MobileSeekBar />
        </div>
      </Player.Controls>
    </>
  );
}

/** Mobile-only back button in the top-left of the player overlay. */
function MobileLiveBackButton() {
  const { playerHandlers } = usePlayerContext();
  return (
    <button
      type="button"
      onClick={playerHandlers.goBack}
      className="p-2 transition-transform active:scale-90"
    >
      <ArrowLeft className="w-6 h-6 text-white stroke-[3px]" />
    </button>
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
