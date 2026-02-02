import type { Track } from 'livekit-client';
import { useEffect, useRef } from 'react';

/**
 * Hook to manage audio stream from LiveKit track.
 * Attaches remote participant audio tracks to an audio element for playback.
 * Handles browser autoplay policies by ensuring proper audio element configuration.
 *
 * @param track - The LiveKit audio track to attach (undefined if not yet available)
 * @param isLocal - Whether this is the local participant's track (skipped for playback)
 * @returns A ref to be attached to an <audio> element
 */
export function useAudioStream(track: Track | undefined, isLocal: boolean) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;

    // Skip if: no audio element, no track, or is local participant (we don't play our own audio)
    if (!audioElement || !track || isLocal) {
      return;
    }

    // Attach the LiveKit track to the audio element
    track.attach(audioElement);

    // Configure audio element for remote playback
    // muted: false is critical - browsers block autoplay of muted audio
    // volume: 1 ensures full volume by default
    audioElement.muted = false;
    audioElement.volume = 1;

    // Attempt to play audio (may be blocked by browser autoplay policies)
    audioElement.play().catch(() => {
      // Silently ignore autoplay failures - user interaction will trigger playback
    });

    // Cleanup: detach track when unmounting or track changes
    return () => {
      track.detach(audioElement);
    };
  }, [track, isLocal]);

  return audioRef;
}
