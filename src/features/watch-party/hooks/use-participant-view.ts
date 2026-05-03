'use client';

import { useEffect, useRef } from 'react';
import type { AgoraParticipant } from '../media/hooks/useAgora';

/**
 * Hook managing the video rendering for a single Agora participant.
 *
 * Attaches the participant's video track to a container div ref.
 * On cleanup, the Agora-created `<video>` element is removed from the
 * container but the track itself is **not** stopped — it stays alive so
 * the next consumer (sidebar grid or floating tile) can re-attach it.
 *
 * @param participant - The Agora participant whose video track to render.
 * @returns A ref for the video container div and a CSS style object for the video.
 */
export function useParticipantView(participant: AgoraParticipant) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = participant.videoTrack;
    const container = videoRef.current;
    if (!track || !container) return;

    track.play(container);

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [participant.videoTrack]);

  const videoStyle = { transform: 'scaleX(1)' };

  return { videoRef, videoStyle };
}
