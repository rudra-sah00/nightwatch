import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { VideoElement } from '../VideoElement';
import { SubtitleOverlay } from './SubtitleOverlay';

export function PlayerVideo() {
  const {
    state,
    dispatch,
    videoRef,
    videoCallbackRef,
    captionUrl,
    playerHandlers,
  } = usePlayerContext();

  // On mobile the tap-to-pause gesture is confusing and causes accidental
  // pauses. Controls are always reachable via the play/pause button instead.
  const isMobile = useMobileDetection();

  return (
    <div className="absolute inset-0 z-0">
      <VideoElement
        ref={videoCallbackRef}
        dispatch={dispatch}
        onClick={isMobile ? undefined : () => playerHandlers.togglePlay()}
        captionUrl={captionUrl || undefined}
        subtitleTracks={state.subtitleTracks}
        currentTrackId={state.currentSubtitleTrack}
        controls={false}
      />
      {/* Custom subtitle overlay — uses CSS vars for full style control */}
      <SubtitleOverlay
        videoRef={videoRef}
        currentTrackId={state.currentSubtitleTrack}
      />
    </div>
  );
}
