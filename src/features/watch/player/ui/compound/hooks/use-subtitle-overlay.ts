import type React from 'react';
import { useEffect, useRef, useState } from 'react';

/** Options for {@link useSubtitleOverlay}. */
interface UseSubtitleOverlayOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTrackId: string | null;
}

/**
 * Extracts active VTT cue text from the video's text tracks and suppresses
 * native browser cue rendering (except during native fullscreen).
 *
 * @param options - Video ref and current subtitle track ID.
 * @returns `cueText` — the currently active subtitle string.
 */
export function useSubtitleOverlay({
  videoRef,
  currentTrackId,
}: UseSubtitleOverlayOptions) {
  const [cueText, setCueText] = useState<string>('');
  const prevCueTextRef = useRef<string>('');
  const isFullscreenRef = useRef(false);

  // Inject CSS to suppress native VTT rendering
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const ensureStyle = () => {
      if (document.getElementById('hide-native-cues')) return;
      const style = document.createElement('style');
      style.id = 'hide-native-cues';
      style.textContent =
        'video::cue { color: transparent; background: transparent; text-shadow: none; }';
      document.head.appendChild(style);
    };

    const removeStyle = () => {
      document.getElementById('hide-native-cues')?.remove();
    };

    const syncCueVisibility = () => {
      const isNativeVideoFullscreen =
        (video as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean })
          .webkitDisplayingFullscreen === true;
      const isDocumentFullscreen = !!document.fullscreenElement;
      isFullscreenRef.current = isNativeVideoFullscreen || isDocumentFullscreen;

      if (isFullscreenRef.current) {
        removeStyle();
      } else {
        ensureStyle();
      }
    };

    const handleFullscreenChange = () => {
      syncCueVisibility();
    };

    syncCueVisibility();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
    video.addEventListener('webkitendfullscreen', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.removeEventListener(
        'webkitbeginfullscreen',
        handleFullscreenChange,
      );
      video.removeEventListener('webkitendfullscreen', handleFullscreenChange);
      removeStyle();
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
        setCueText(isFullscreenRef.current ? '' : activeText);
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
