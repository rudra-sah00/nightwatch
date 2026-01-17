'use client';

import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerAudioTrack, QualityLevel, QualityValue } from '@/types/video';

interface UseHlsPlayerOptions {
  src: string;
  onError?: (message: string) => void;
}

interface NetworkStats {
  bandwidth: number; // estimated bandwidth in bits/s
  latency: number; // estimated latency in ms
}

interface UseHlsPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  qualityLevels: QualityLevel[];
  currentQuality: QualityValue;
  actualQualityLevel: number;
  isAutoQuality: boolean;
  audioTracks: PlayerAudioTrack[];
  currentAudioTrack: number;
  networkStats: NetworkStats | null;
  isBuffering: boolean;
  // Actions
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  changeQuality: (level: QualityValue) => void;
  changeAudioTrack: (trackId: number) => void;
}

export function useHlsPlayer({ src, onError }: UseHlsPlayerOptions): UseHlsPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<QualityValue>('auto');
  const [actualQualityLevel, setActualQualityLevel] = useState<number>(-1);
  const [isAutoQuality, setIsAutoQuality] = useState(true);
  const [audioTracks, setAudioTracks] = useState<PlayerAudioTrack[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isBuffering, _setIsBuffering] = useState(false);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30, // Reduced to avoid rate limiting
        maxBufferLength: 20, // Reduced buffer length
        maxMaxBufferLength: 40, // Reduced max buffer
        // Enable ABR (Adaptive Bitrate) settings
        abrEwmaDefaultEstimate: 500000, // 500kbps default
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,
        // Progressive loading for smoother switching
        progressive: true,
        // Retry settings to avoid rate limiting
        manifestLoadingRetryDelay: 2000, // Wait 2s before retrying manifest
        manifestLoadingMaxRetry: 2, // Only retry twice
        levelLoadingRetryDelay: 2000, // Wait 2s before retrying level
        levelLoadingMaxRetry: 2, // Only retry twice
        fragLoadingRetryDelay: 2000, // Wait 2s before retrying fragment
        fragLoadingMaxRetry: 2, // Only retry twice
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setQualityLevels(levels);
        setCurrentQuality('auto');

        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Audio ${index + 1}`,
          lang: track.lang || 'unknown',
        }));
        setAudioTracks(tracks);
      });

      // Audio tracks might be populated after manifest parsing
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, _data) => {
        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Audio ${index + 1}`,
          lang: track.lang || 'unknown',
        }));
        setAudioTracks(tracks);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        // Update actual quality level (what's actually playing)
        setActualQualityLevel(data.level);

        // Only update currentQuality if not in auto mode
        if (hlsRef.current?.autoLevelEnabled) {
          setIsAutoQuality(true);
          setCurrentQuality('auto');
        } else {
          setCurrentQuality(data.level);
          setIsAutoQuality(false);
        }
      });

      // Track network statistics for quality display
      hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
        if (data.frag.stats) {
          const stats = data.frag.stats;
          const bandwidth = ((stats.loaded * 8) / (stats.loading.end - stats.loading.start)) * 1000;
          setNetworkStats({
            bandwidth: Math.round(bandwidth),
            latency: Math.round(stats.loading.first - stats.loading.start),
          });
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              onError?.('Network error - retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              onError?.('Media error - recovering...');
              hls.recoverMediaError();
              break;
            default:
              onError?.('Playback error occurred');
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      // For native HLS, quality selection is handled by the browser
      // These values are set during component initialization
    } else {
      onError?.('HLS not supported in this browser');
    }
  }, [src, onError]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updateBuffer = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('progress', updateBuffer);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('progress', updateBuffer);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Actions
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, time));
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    video.volume = clampedVolume;
    setVolumeState(clampedVolume);
    setIsMuted(clampedVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const changeQuality = useCallback((level: QualityValue) => {
    if (hlsRef.current) {
      if (level === 'auto') {
        hlsRef.current.currentLevel = -1; // Enable auto level selection
        setIsAutoQuality(true);
      } else {
        hlsRef.current.currentLevel = level;
        setIsAutoQuality(false);
      }
      setCurrentQuality(level);
    }
  }, []);

  const changeAudioTrack = useCallback((trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
  }, []);

  return {
    videoRef,
    hlsRef,
    isPlaying,
    currentTime,
    duration,
    buffered,
    volume,
    isMuted,
    qualityLevels,
    currentQuality,
    actualQualityLevel,
    isAutoQuality,
    audioTracks,
    currentAudioTrack,
    networkStats,
    isBuffering,
    togglePlay,
    seek,
    skip,
    setVolume,
    toggleMute,
    changeQuality,
    changeAudioTrack,
  };
}
