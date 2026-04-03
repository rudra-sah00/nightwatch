import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface UseSubtitleOverlayOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTrackId: string | null;
}

export function useSubtitleOverlay({
  videoRef,
  currentTrackId,
}: UseSubtitleOverlayOptions) {
  const [cueText, setCueText] = useState<string>('');
  const prevCueTextRef = useRef<string>('');

  // Inject CSS to suppress native VTT rendering
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const style = document.createElement('style');
    style.id = 'hide-native-cues';
    style.textContent =
      'video::cue { color: transparent; background: transparent; text-shadow: none; }';
    document.head.appendChild(style);

    return () => {
      document.getElementById('hide-native-cues')?.remove();
    };
  }, [videoRef]);

  // Track active cue text
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleCueChange = () => {
      let activeText = '';

      if (currentTrackId) {
        const textTracks = video.textTracks;
        let targetTrack: TextTrack | undefined;

        // Try to find exact match by ID first
        for (let i = 0; i < textTracks.length; i++) {
          const t = textTracks[i];
          if (t.id === currentTrackId) {
            targetTrack = t;
            break;
          }
        }

        // Fallback: search by tracking state order or label if ID was stripped (Chromium bug)
        if (!targetTrack && currentTrackId && currentTrackId !== 'off') {
          for (let i = 0; i < textTracks.length; i++) {
            const t = textTracks[i];
            // Active subtitle track can be either hidden/showing depending on
            // native player requirements.
            if (t.mode !== 'disabled') {
              targetTrack = t;
              break;
            }
          }
        }

        if (targetTrack && targetTrack.mode !== 'disabled') {
          const cues = targetTrack.activeCues;
          if (cues && cues.length > 0) {
            const parts: string[] = [];
            for (let j = 0; j < cues.length; j++) {
              const cue = cues[j] as VTTCue;
              parts.push(cue.text);
            }
            activeText = parts.join('\n');
          }
        }
      }

      if (activeText !== prevCueTextRef.current) {
        setCueText(activeText);
        prevCueTextRef.current = activeText;
      }
    };

    handleCueChange();

    const textTracks = video.textTracks;
    const cleanupListeners: (() => void)[] = [];

    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      track.addEventListener('cuechange', handleCueChange);
      cleanupListeners.push(() =>
        track.removeEventListener('cuechange', handleCueChange),
      );
    }

    return () => {
      cleanupListeners.forEach((remove) => {
        remove();
      });
    };
  }, [videoRef, currentTrackId]);

  return { cueText };
}
