'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
import { Player } from '../player';
import { usePlayerContext } from '../player/context/PlayerContext';
import type { VideoMetadata } from '../player/context/types';
import { useStreamRevocation } from '../player/hooks/useStreamRevocation';
import { CenterPlayButton } from '../player/ui/controls/PlayPause';
import { BufferingOverlay } from '../player/ui/overlays/BufferingOverlay';
import { ErrorOverlay } from '../player/ui/overlays/ErrorOverlay';
import { LoadingOverlay } from '../player/ui/overlays/LoadingOverlay';

export interface WatchLivePlayerProps {
  streamUrl: string | null;
  metadata: VideoMetadata;
  mobileHeaderContent?: React.ReactNode;
}

export const WatchLivePlayer = memo(function WatchLivePlayer(
  props: WatchLivePlayerProps,
) {
  const router = useRouter();

  const [revokedError, setRevokedError] = useState<string | null>(null);

  useStreamRevocation({
    onRevoked: () => {
      setRevokedError(
        'Playback stopped — you started playing on another tab or device.',
      );
    },
  });

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/live');
    }
  };

  return (
    <Player.Root
      {...props}
      containerStyle={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
      isLive
      onBack={handleBack}
      onNavigate={(url) => router.push(url)}
    >
      {/* Mobile Header - Solid Top Bar */}
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
        </div>
        {props.mobileHeaderContent}
      </div>

      <LivePlayerState revokedError={revokedError} />
    </Player.Root>
  );
});
function LivePlayerState({ revokedError }: { revokedError: string | null }) {
  const { state, playerHandlers, metadata } = usePlayerContext();
  const error = revokedError || state.error;

  return (
    <>
      {state.isLoading ? (
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
        isLoading={state.isLoading}
      />

      <LiveBufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

      <ErrorOverlay
        isVisible={!!error}
        message={error || 'Live stream unavailable'}
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
          <Player.Spacer />
          <Player.SettingsMenu />
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
