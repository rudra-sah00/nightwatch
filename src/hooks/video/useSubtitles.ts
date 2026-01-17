'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { convertToVtt, parseSubtitleContent } from '@/lib/utils/video-utils';
import type { LocalSubtitle, PlayerSubtitleTrack, SubtitleCue } from '@/types/video';

interface UseSubtitlesOptions {
  subtitles?: PlayerSubtitleTrack[];
  currentTime: number;
}

interface UseSubtitlesReturn {
  localSubtitles: LocalSubtitle[];
  parsedCues: SubtitleCue[][];
  currentSubtitleIndex: number;
  currentSubtitleText: string;
  setCurrentSubtitle: (index: number) => void;
  getSubtitleLabel: (index: number) => string;
}

export function useSubtitles({ subtitles, currentTime }: UseSubtitlesOptions): UseSubtitlesReturn {
  const [localSubtitles, setLocalSubtitles] = useState<LocalSubtitle[]>([]);
  const [parsedCues, setParsedCues] = useState<SubtitleCue[][]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1);
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');

  // Load and parse subtitles
  useEffect(() => {
    const revokedUrls: string[] = [];

    const loadSubtitles = async () => {
      if (!subtitles || subtitles.length === 0) {
        setLocalSubtitles([]);
        setParsedCues([]);
        return;
      }

      try {
        const results: LocalSubtitle[] = [];
        const parsed: SubtitleCue[][] = [];

        for (const sub of subtitles) {
          try {
            const res = await fetch(sub.url, { cache: 'no-store' });
            const text = await res.text();
            const vttText = convertToVtt(text);
            const cues = parseSubtitleContent(vttText);
            parsed.push(cues);

            const blob = new Blob([vttText], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);
            results.push({ language: sub.language, url });
            revokedUrls.push(url);
          } catch {
            parsed.push([]);
          }
        }

        setLocalSubtitles(results);
        setParsedCues(parsed);
      } catch {
        // Subtitle preprocessing failed silently
      }
    };

    loadSubtitles();

    return () => {
      for (const url of revokedUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [subtitles]);

  // Update current subtitle text based on time
  // Using a ref to compute without triggering setState synchronously
  const subtitleTextRef = useRef('');

  useEffect(() => {
    let newText = '';

    if (currentSubtitleIndex >= 0 && parsedCues[currentSubtitleIndex]) {
      const cues = parsedCues[currentSubtitleIndex];
      const activeCue = cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);
      newText = activeCue?.text || '';
    }

    // Only update if text changed
    if (newText !== subtitleTextRef.current) {
      subtitleTextRef.current = newText;
      queueMicrotask(() => {
        setCurrentSubtitleText(newText);
      });
    }
  }, [currentTime, currentSubtitleIndex, parsedCues]);

  const setCurrentSubtitle = useCallback((index: number) => {
    setCurrentSubtitleIndex(index);
  }, []);

  const getSubtitleLabel = useCallback(
    (index: number) => {
      if (index < 0) return 'Off';
      return localSubtitles[index]?.language || `Subtitle ${index + 1}`;
    },
    [localSubtitles]
  );

  return {
    localSubtitles,
    parsedCues,
    currentSubtitleIndex,
    currentSubtitleText,
    setCurrentSubtitle,
    getSubtitleLabel,
  };
}
