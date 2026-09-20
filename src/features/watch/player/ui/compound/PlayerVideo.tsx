'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';
import { useLongPressSpeedBoost } from '../../hooks/useLongPressSpeedBoost';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { VideoElement } from '../VideoElement';
import { SubtitleOverlay } from './SubtitleOverlay';

type TapZone = 'left' | 'right';

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
    let frames = 0;

    const draw = () => {
      if (!running) return;
      // Paint every 10th frame (~6 fps @ 60Hz). Since it's heavily blurred (20px),
      // update fidelity isn't needed and this saves massive CPU/GPU cycles.
      if (
        frames % 10 === 0 &&
        !video.paused &&
        !video.ended &&
        video.readyState >= 2
      ) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      frames++;
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
    metadata,
    readOnly,
    videoRef,
    videoCallbackRef,
    captionUrl,
    playerHandlers,
  } = usePlayerContext();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useAmbientCanvas(videoRef, canvasRef);

  const t = useTranslations('watch');

  // On mobile the tap-to-pause gesture is confusing and causes accidental
  // pauses. Controls are always reachable via the play/pause button instead.
  const isMobile = useMobileDetection();
  const lastTapRef = useRef<{ zone: TapZone; at: number } | null>(null);

  const canUseTapSeek =
    isMobile && !readOnly && metadata.type !== 'livestream' && !state.isLoading;

  // Long-press anywhere on the video for 2x, matching the Space-key gesture on desktop.
  // Shares `engageSpeedBoost`/`releaseSpeedBoost` with the keyboard path, so the rules
  // (never boost a paused video, never exceed a rate already >= 2x, restore exactly what
  // the user had) live in one place.
  const { longPressHandlers, didBoost } = useLongPressSpeedBoost({
    engageSpeedBoost: playerHandlers.engageSpeedBoost,
    releaseSpeedBoost: playerHandlers.releaseSpeedBoost,
    enabled: isMobile && !readOnly,
  });

  // A long press must not also register as a tap-seek on release.
  const handleTapZone = (zone: TapZone) => {
    if (didBoost()) return;
    handleTapSeek(zone);
  };

  const handleTapSeek = (zone: TapZone) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.zone === zone && now - last.at <= 280) {
      playerHandlers.skip(zone === 'left' ? -10 : 10);
      lastTapRef.current = null;
      return;
    }
    lastTapRef.current = { zone, at: now };
  };

  return (
    <div className="absolute inset-0 z-0 bg-black">
      {/* Ambient canvas — blurred live video frames fill any black bars from
          letterbox (wide movies) or pillarbox (vertical content / ultrawide).
          Disabled on mobile where the video fills the screen and the GPU cost
          of continuous blur compositing hurts smoothness. */}
      {!isMobile && (
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
      )}
      {/* Video layer sits above the canvas. Carries the mobile long-press-to-2x
          gesture; the equivalent action is Space on the keyboard and the speed menu in
          the control bar, so this adds no touch-only capability. */}
      <div className="absolute inset-0 z-[1]" {...longPressHandlers}>
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

        {canUseTapSeek ? (
          <div className="absolute inset-0 z-[2] pointer-events-none">
            <button
              type="button"
              data-tap-zone
              aria-label={t('aria.seekBackward')}
              className="absolute inset-y-0 left-0 w-1/3 pointer-events-auto bg-transparent"
              onClick={() => handleTapZone('left')}
            />
            <button
              type="button"
              data-tap-zone
              aria-label={t('aria.seekForward')}
              className="absolute inset-y-0 right-0 w-1/3 pointer-events-auto bg-transparent"
              onClick={() => handleTapZone('right')}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
