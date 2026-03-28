import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  initialPlayerState,
  playerReducer,
  type SubtitleTrack,
  type VideoMetadata,
} from '../../../context/types';
import { useFullscreen } from '../../../hooks/useFullscreen';
import { useKeyboard } from '../../../hooks/useKeyboard';
import { useMobileDetection } from '../../../hooks/useMobileDetection';
import { useNextEpisode } from '../../../hooks/useNextEpisode';
import { usePlayerEngine } from '../../../hooks/usePlayerEngine';
import { usePlayerHandlers } from '../../../hooks/usePlayerHandlers';
import { useWatchProgress } from '../../../hooks/useWatchProgress';
import {
  applySubtitleSettings,
  loadSubtitleSettings,
  type SubtitleSettings,
} from '../../controls/utils/subtitle-settings';

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
  /** When provided the matching track is pre-selected on initial load so the
   * AudioSelector highlights the currently-playing dub without user interaction. */
  initialAudioTrackId?: string;
  onBack?: () => void;
  isLive?: boolean;
  providerId?: 's1' | 's2' | 's3';
  playbackRate?: number;
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
  initialAudioTrackId,
  onBack: onBackProp,
  isLive = false,
  providerId: _providerId,
  playbackRate: playbackRateProp,
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

  // Stabilise the initialAudioTracks reference — the parent may create a
  // new array every render. We serialise to a key so the effect only fires
  // when the actual track ids change, and read via ref to satisfy deps.
  const audioTracksRef = useRef(initialAudioTracks);
  audioTracksRef.current = initialAudioTracks;

  const initialAudioTrackIdRef = useRef(initialAudioTrackId);
  initialAudioTrackIdRef.current = initialAudioTrackId;

  const audioTracksKey = initialAudioTracks
    ? JSON.stringify(initialAudioTracks.map((t) => t.id))
    : '';

  useEffect(() => {
    if (!audioTracksKey) return; // no tracks to process
    const tracks = audioTracksRef.current;
    if (!tracks || tracks.length === 0) return;
    // Always re-seed when the key changes (e.g. after a language switch on S2).
    // The audioTracksKey dep already guards against spurious re-runs — we only
    // reach here when the actual track IDs have changed.
    dispatch({
      type: 'SET_AUDIO_TRACKS',
      audioTracks: tracks.map((t) => ({
        id: t.id,
        label: t.label,
        language: t.language,
        isDefault: false,
      })),
    });
    // Pre-select the active dub so AudioSelector highlights it on first render.
    const activeId = initialAudioTrackIdRef.current;
    if (activeId && tracks.some((t) => t.id === activeId)) {
      dispatch({ type: 'SET_CURRENT_AUDIO_TRACK', trackId: activeId });
    }
  }, [audioTracksKey]); // intentionally excludes state.audioTracks — dispatching it is sufficient

  // Stabilise the subtitleTracks reference — the parent often creates a new
  // array on every render which would cause an infinite dispatch loop.
  // Read via ref so the effect body doesn't reference the unstable prop.
  const subtitleTracksRef = useRef(subtitleTracks);
  subtitleTracksRef.current = subtitleTracks;

  const subtitleTracksKey = subtitleTracks
    ? JSON.stringify(subtitleTracks.map((t) => t.id + t.src))
    : '';

  useEffect(() => {
    if (subtitleTracksKey) {
      const tracks = subtitleTracksRef.current;
      if (tracks && tracks.length > 0) {
        const mapped: SubtitleTrack[] = tracks.map((t, index) => ({
          id: t.id || `${t.language}-${index}`,
          label: t.label,
          language: t.language,
          src: t.src,
        }));
        dispatch({ type: 'SET_SUBTITLE_TRACKS', subtitleTracks: mapped });
      }
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
  }, [captionUrl, subtitleTracksKey]);

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
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
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

  // Ref bridge allows useKeyboard to access showControls (from usePlayerHandlers)
  // despite the circular dependency (handlers need seek/togglePlay from keyboard).
  const showControlsRef = useRef<() => void>(null);

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
    onInteraction: () => showControlsRef.current?.(),
  });

  const { enterFullscreen, toggleFullscreen: nativeToggleFullscreen } =
    useFullscreen({
      containerRef,
      videoRef,
      dispatch,
      playerIsFullscreen: state.isFullscreen,
    });

  const toggleFullscreen = fullscreenToggleOverride || nativeToggleFullscreen;

  useEffect(() => {
    if (isFullscreenOverride !== undefined) {
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: isFullscreenOverride });
    }
  }, [isFullscreenOverride]);

  // Sync playback rate from external prop (e.g. Watch Party host)
  useEffect(() => {
    if (
      playbackRateProp !== undefined &&
      playbackRateProp !== state.playbackRate
    ) {
      dispatch({ type: 'SET_PLAYBACK_RATE', rate: playbackRateProp });
    }
  }, [playbackRateProp, state.playbackRate]);

  // On mobile, automatically lock to landscape the moment playback starts.
  // This handles all player types (HLS, MP4, livestream) uniformly.
  const isMobileForLock = useMobileDetection();
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (!isMobileForLock) return;
    const justStarted = state.isPlaying && !wasPlayingRef.current;
    wasPlayingRef.current = state.isPlaying;
    if (justStarted && !state.isFullscreen && !fullscreenToggleOverride) {
      enterFullscreen();
    }
  }, [
    state.isPlaying,
    state.isFullscreen,
    isMobileForLock,
    enterFullscreen,
    fullscreenToggleOverride,
  ]);

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

  // Assign the handler to the ref so useKeyboard can trigger it
  showControlsRef.current = showControls;

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
