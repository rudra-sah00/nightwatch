import type { Track } from 'livekit-client';
import { useEffect, useRef } from 'react';

/**
 * Hook to manage audio stream from LiveKit track.
 * Ensures audio element is properly configured for remote playback.
 */
export function useAudioStream(track: Track | undefined, isLocal: boolean) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !track || isLocal) return;

    // Attach the track to the audio element
    track.attach(audioElement);

    // Ensure audio is unmuted for remote participants
    // This is critical for browser autoplay policies
    audioElement.muted = false;

    return () => {
      track.detach(audioElement);
    };
  }, [track, isLocal]);

  return audioRef;
}
