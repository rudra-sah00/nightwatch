import { usePlayerContext } from '../../context/PlayerContext';
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

  return (
    <div className="absolute inset-0 z-0">
      <VideoElement
        ref={videoCallbackRef}
        dispatch={dispatch}
        onClick={() => {
          playerHandlers.togglePlay();
        }}
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
