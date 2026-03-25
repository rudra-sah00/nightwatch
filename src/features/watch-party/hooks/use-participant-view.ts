'use client';

import { useEffect, useRef } from 'react';
import type { AgoraParticipant } from '../media/hooks/useAgora';

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
