'use client';

import { useEffect, useRef } from 'react';
import type { AgoraParticipant } from '../media/hooks/useAgora';

/**
 * Hook managing the video rendering for a single Agora participant.
 *
 * Attaches the participant's video track to a container div ref and
 * cleans up on unmount or track change. Returns a non-mirrored video style.
 *
 * @param participant - The Agora participant whose video track to render.
 * @returns A ref for the video container div and a CSS style object for the video.
 */
export function useParticipantView(participant: AgoraParticipant) {
  const videoRef = useRef<HTMLDivElement>(null);

  // Attach video track to container
  useEffect(() => {
    const track = participant.videoTrack;
    if (!track || !videoRef.current) return;

    track.play(videoRef.current);
    return () => {
      track.stop();
    };
  }, [participant.videoTrack]);

  // No mirroring for video tracks
  const videoStyle = { transform: 'scaleX(1)' };

  return { videoRef, videoStyle };
}
