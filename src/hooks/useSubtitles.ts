'use client';

import { useState, useEffect, useCallback } from 'react';
import { SubtitleTrack, SubtitleCue, LocalSubtitle } from '@/types/video';
import { parseSubtitleContent, convertToVtt } from '@/lib/utils/video-utils';

interface UseSubtitlesOptions {
  subtitles?: SubtitleTrack[];
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
    let revokedUrls: string[] = [];

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
          } catch (e) {
            console.warn('Failed to load subtitle:', sub.language, e);
            parsed.push([]);
          }
        }

        setLocalSubtitles(results);
        setParsedCues(parsed);
      } catch (e) {
        console.warn('Subtitle preprocessing failed:', e);
      }
    };

    loadSubtitles();

    return () => {
      revokedUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [subtitles]);

  // Update current subtitle text based on time
  useEffect(() => {
    if (currentSubtitleIndex < 0 || !parsedCues[currentSubtitleIndex]) {
      setCurrentSubtitleText('');
      return;
    }

    const cues = parsedCues[currentSubtitleIndex];
    const activeCue = cues.find(
      (cue) => currentTime >= cue.start && currentTime <= cue.end
    );
    setCurrentSubtitleText(activeCue?.text || '');
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
