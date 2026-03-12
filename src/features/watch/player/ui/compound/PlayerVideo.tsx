'use client';

import { useEffect, useRef } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { VideoElement } from '../VideoElement';
import { SubtitleOverlay } from './SubtitleOverlay';

/** Continuously paints video frames onto a low-res canvas used as an ambient
 *  blur background. Fills black bars from letterbox / pillarbox regardless of
 *  screen size or video aspect ratio. */
function useAmbientCanvas(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let running = true;

    const draw = () => {
      if (!running) return;
      if (!video.paused && !video.ended && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [videoRef, canvasRef]);
}

export function PlayerVideo() {
  const {
    state,
    dispatch,
    videoRef,
    videoCallbackRef,
    captionUrl,
    playerHandlers,
  } = usePlayerContext();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useAmbientCanvas(videoRef, canvasRef);

  // On mobile the tap-to-pause gesture is confusing and causes accidental
  // pauses. Controls are always reachable via the play/pause button instead.
  const isMobile = useMobileDetection();

  return (
    <div className="absolute inset-0 z-0 bg-black">
      {/* Ambient canvas — blurred live video frames fill any black bars from
          letterbox (wide movies) or pillarbox (vertical content / ultrawide). */}
      <canvas
        ref={canvasRef}
        width={128}
        height={72}
        className="absolute inset-0 w-full h-full"
        style={{
          filter: 'blur(20px) brightness(0.35)',
          transform: 'scale(1.1)',
        }}
      />
      {/* Video layer sits above the canvas */}
      <div className="absolute inset-0 z-[1]">
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
    </div>
  );
}
