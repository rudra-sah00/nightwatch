import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  initialPlayerState,
  playerReducer,
  type SubtitleTrack,
  type VideoMetadata,
} from '../../context/types';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useNextEpisode } from '../../hooks/useNextEpisode';
import { usePlayerEngine } from '../../hooks/usePlayerEngine';
import { usePlayerHandlers } from '../../hooks/usePlayerHandlers';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import {
  applySubtitleSettings,
  loadSubtitleSettings,
  type SubtitleSettings,
} from '../controls/subtitle-settings';

interface PlayerRootHookProps {
  streamUrl: string | null;
  metadata: VideoMetadata;
  captionUrl?: string | null;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  qualities?: { quality: string; url: string }[];
  spriteVtt?: string;
  spriteSheet?: {
    imageUrl: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
    interval: number;
  };
  readOnly?: boolean;
  isHost?: boolean;
  isAuthenticated?: boolean;
  onNavigate?: (url: string) => void;
  fullscreenToggleOverride?: () => void;
  isFullscreenOverride?: boolean;
  onStreamExpired?: () => void;
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
  initialAudioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  onAudioTrackChange?: (trackId: string) => void;
  onBack?: () => void;
  isLive?: boolean;
}

export function usePlayerRoot({
  streamUrl,
  metadata,
  captionUrl,
  subtitleTracks,
  qualities,
  spriteVtt,
  spriteSheet,
  readOnly = false,
  isHost = true,
  isAuthenticated = true,
  onNavigate,
  fullscreenToggleOverride,
  isFullscreenOverride,
  onStreamExpired,
  onVideoRef,
  initialAudioTracks,
  onAudioTrackChange,
  onBack: onBackProp,
  isLive = false,
}: PlayerRootHookProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
        el;
      onVideoRef?.(el);
    },
    [onVideoRef],
  );

  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    () => {
      const saved = loadSubtitleSettings();
      if (typeof window !== 'undefined') {
        applySubtitleSettings(saved);
      }
      return saved;
    },
  );

  const { setQuality, setAudioTrack } = usePlayerEngine({
    videoRef,
    streamUrl,
    dispatch,
    onStreamExpired,
    qualities,
    providerId: metadata.providerId,
    isLive,
  });

  useEffect(() => {
    if (!initialAudioTracks || initialAudioTracks.length === 0) return;
    if (state.audioTracks.length > 0) return;
    dispatch({
      type: 'SET_AUDIO_TRACKS',
      audioTracks: initialAudioTracks.map((t) => ({
        id: t.id,
        label: t.label,
        language: t.language,
        isDefault: false,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAudioTracks, state.audioTracks.length]);

  useEffect(() => {
    if (subtitleTracks && subtitleTracks.length > 0) {
      const tracks: SubtitleTrack[] = subtitleTracks.map((t, index) => ({
        id: t.id || `${t.language}-${index}`,
        label: t.label,
        language: t.language,
        src: t.src,
      }));
      dispatch({ type: 'SET_SUBTITLE_TRACKS', subtitleTracks: tracks });
    } else if (captionUrl) {
      const subtitleTrack: SubtitleTrack = {
        id: 'en',
        label: 'English',
        language: 'en',
        src: captionUrl,
      };
      dispatch({
        type: 'SET_SUBTITLE_TRACKS',
        subtitleTracks: [subtitleTrack],
      });
    }
  }, [captionUrl, subtitleTracks]);

  useEffect(() => {
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
        const actions: MediaSessionAction[] = [
          'play',
          'pause',
          'stop',
          'seekbackward',
          'seekforward',
          'previoustrack',
          'nexttrack',
        ];
        for (const action of actions) {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {
            /* unsupported */
          }
        }
      }
    };
  }, []);

  const handleNavigate = useCallback(
    (url: string) => {
      if (onNavigate) {
        onNavigate(url);
      } else {
        router.push(url);
      }
    },
    [router, onNavigate],
  );

  const {
    showNextEpisode,
    nextEpisodeInfo,
    isLoadingNext,
    playNextEpisode,
    cancelNextEpisode,
  } = useNextEpisode({
    metadata,
    currentTime: state.currentTime,
    duration: state.duration,
    isPlaying: state.isPlaying && !state.isPaused,
    onNavigate: handleNavigate,
    server: metadata.providerId,
  });

  const handleProgressLoaded = useCallback((seconds: number) => {
    if (seconds > 0 && videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  }, []);

  useWatchProgress({
    videoRef,
    metadata,
    isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
    onProgressLoaded: isHost ? handleProgressLoaded : undefined,
    skipProgressHistory: !isHost,
    enableProgressLoad: isHost,
    skipActivityTracking: !isAuthenticated,
    hasMoreEpisodes:
      metadata.type === 'series' ? nextEpisodeInfo !== null : undefined,
  });

  const handleBack = useCallback(() => {
    if (onBackProp) {
      onBackProp();
    } else {
      router.push('/home');
    }
  }, [onBackProp, router]);

  const toggleCaptions = useCallback(() => {
    if (state.currentSubtitleTrack) {
      dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId: null });
    } else if (state.subtitleTracks.length > 0) {
      dispatch({
        type: 'SET_CURRENT_SUBTITLE_TRACK',
        trackId: state.subtitleTracks[0].id,
      });
    }
  }, [state.currentSubtitleTrack, state.subtitleTracks]);

  const { togglePlay, toggleMute, seek } = useKeyboard({
    videoRef,
    containerRef,
    dispatch,
    isFullscreen: state.isFullscreen,
    onBack: handleBack,
    currentSubtitleTrack: state.currentSubtitleTrack,
    onToggleCaptions: toggleCaptions,
    hasNextEpisode: !!nextEpisodeInfo,
    onNextEpisode: playNextEpisode,
    disabled: readOnly,
    isLive,
  });

  const { toggleFullscreen: nativeToggleFullscreen } = useFullscreen({
    containerRef,
    videoRef,
    dispatch,
  });

  const toggleFullscreen = fullscreenToggleOverride || nativeToggleFullscreen;

  useEffect(() => {
    if (isFullscreenOverride !== undefined) {
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: isFullscreenOverride });
    }
  }, [isFullscreenOverride]);

  const {
    showControls,
    handleSeek,
    handleSkip,
    handleVolumeChange,
    handleMuteToggle,
    handleTogglePlay,
    handleVideoClick,
    handleQualityChange,
    handlePlaybackRateChange,
    handleAudioChange,
    handleSubtitleChange,
    handleInteraction,
  } = usePlayerHandlers({
    videoRef,
    dispatch,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    readOnly,
    isLoading: state.isLoading,
    togglePlay,
    toggleMute,
    seek,
    setQuality,
    setAudioTrack,
    qualities: state.qualities,
    onExternalAudioChange: onAudioTrackChange,
  });

  const contextValue = {
    state,
    dispatch,
    metadata,
    streamUrl,
    videoRef,
    videoCallbackRef: handleVideoCallbackRef,
    containerRef,
    spriteSheet,
    spriteVtt,
    readOnly,
    isHost,
    isAuthenticated,
    onNavigate,
    onStreamExpired,
    qualities,
    captionUrl,
    subtitleTracks,
    playerHandlers: {
      togglePlay: handleTogglePlay,
      toggleMute: handleMuteToggle,
      seek: handleSeek,
      skip: handleSkip,
      setVolume: handleVolumeChange,
      toggleFullscreen,
      goBack: handleBack,
      setQuality: handleQualityChange,
      setPlaybackRate: handlePlaybackRateChange,
      setAudioTrack: handleAudioChange,
      setSubtitleTrack: handleSubtitleChange,
      handleInteraction,
    },
    nextEpisode: {
      show: showNextEpisode,
      info: nextEpisodeInfo,
      isLoading: isLoadingNext,
      play: playNextEpisode,
      cancel: cancelNextEpisode,
    },
  };

  return {
    state,
    containerRef,
    contextValue,
    showControls,
    handleVideoClick,
    subtitleSettings,
    setSubtitleSettings,
  };
}
