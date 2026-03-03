'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { useLiveClock } from '../hooks/use-live-clock';
import { Player } from '../player';
import { usePlayerContext } from '../player/context/PlayerContext';
import type { VideoMetadata } from '../player/context/types';
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

  const handleBack = () => {
    router.push('/live');
  };

  return (
    <Player.Root
      {...props}
      isLive
      onBack={handleBack}
      onNavigate={(url) => router.push(url)}
    >
      {/* Mobile Header - Solid Top Bar */}
      <div className="relative z-50 p-4 flex md:hidden items-center gap-4 bg-black pointer-events-auto border-b border-white/5">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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

      <LivePlayerState />
    </Player.Root>
  );
});

/** Ticking real-time wall-clock — e.g. "14:32:07" */
function _LiveClock() {
  const { time } = useLiveClock();
  return (
    <span className="text-white/50 text-xs font-mono tabular-nums">{time}</span>
  );
}

function LivePlayerState() {
  const { state, playerHandlers } = usePlayerContext();

  return (
    <>
      {state.isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-1000">
          <LoadingOverlay isVisible={true} />
        </div>
      ) : null}

      <Player.Video />

      <BufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

      <ErrorOverlay
        isVisible={!!state.error}
        message={state.error || 'Live stream unavailable'}
        onRetry={() => {
          window.location.reload();
        }}
        onBack={playerHandlers.goBack}
      />

      <Player.Controls>
        <Player.Header />

        {/* Bottom control row — no seek bar for live */}
        <Player.ControlRow>
          <Player.PlayPause />
          <Player.Volume />
          {/* LIVE badge:
                        • Solid red + non-clickable when at the live edge
                        • Dim border + clickable "jump to live" when player has fallen behind */}
          <Player.LiveBadge />
          <Player.Spacer />
          <Player.SettingsMenu />
          <Player.Fullscreen />
        </Player.ControlRow>
      </Player.Controls>
    </>
  );
}
