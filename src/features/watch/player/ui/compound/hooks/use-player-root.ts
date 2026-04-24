import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import {
  initialPlayerState,
  playerReducer,
  type SubtitleTrack,
  type VideoMetadata,
} from '../../../context/types';
import { useFullscreen } from '../../../hooks/useFullscreen';
import { useKeyboard } from '../../../hooks/useKeyboard';
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
  skipProgressHistory?: boolean;
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
  skipProgressHistory = false,
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
    if ('mediaSession' in navigator) {
      const art = metadata.posterUrl
        ? [
            { src: metadata.posterUrl, sizes: '96x144', type: 'image/jpeg' },
            { src: metadata.posterUrl, sizes: '256x384', type: 'image/jpeg' },
            { src: metadata.posterUrl, sizes: '512x768', type: 'image/jpeg' },
          ]
        : [];

      let mediaTitle = metadata.title;
      let mediaArtist = 'Nightwatch';

      if (metadata.type === 'series') {
        mediaTitle = metadata.episodeTitle
          ? `Ep ${metadata.episode}: ${metadata.episodeTitle}`
          : `Episode ${metadata.episode}`;
        mediaArtist = `${metadata.title} (S${metadata.season})`;
      } else if (metadata.type === 'livestream') {
        mediaTitle = `${metadata.title}`;
        mediaArtist = 'Live Stream';
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: mediaTitle,
        artist: mediaArtist,
        album: 'Nightwatch',
        artwork: art,
      });
    }

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
  }, [
    metadata.episode,
    metadata.episodeTitle,
    metadata.posterUrl,
    metadata.season,
    metadata.title,
    metadata.type,
  ]);

  const isNavigatingRef = useRef(false);

  const handleNavigate = useCallback(
    (url: string) => {
      isNavigatingRef.current = true;
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
    if (Number.isFinite(seconds) && seconds > 0 && videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  }, []);

  useWatchProgress({
    videoRef,
    metadata,
    isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
    onProgressLoaded: isHost ? handleProgressLoaded : undefined,
    skipProgressHistory: skipProgressHistory || !isHost,
    enableProgressLoad: isHost,
    skipActivityTracking: !isAuthenticated,
    hasMoreEpisodes:
      metadata.type === 'series' ? nextEpisodeInfo !== null : undefined,
  });

  const handleBack = useCallback(() => {
    isNavigatingRef.current = true;
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

  const { toggleFullscreen: nativeToggleFullscreen } = useFullscreen({
    containerRef,
    videoRef,
    dispatch,
    playerIsFullscreen: state.isFullscreen,
  });

  const toggleFullscreen = fullscreenToggleOverride || nativeToggleFullscreen;

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
    onToggleFullscreen: toggleFullscreen,
  });

  const [_isDesktopPip, setIsDesktopPip] = useState(false);
  const isPipRef = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (checkIsDesktop() && desktopBridge.onPipModeChanged) {
      unsubscribe = desktopBridge.onPipModeChanged((isPip) => {
        setIsDesktopPip(isPip);
        isPipRef.current = isPip;
        dispatch({ type: isPip ? 'HIDE_CONTROLS' : 'SHOW_CONTROLS' });

        // Let the CSS know we are in native PiP so we can strip borders
        if (isPip) {
          document.body.classList.add('is-desktop-pip');
        } else {
          document.body.classList.remove('is-desktop-pip');
        }
      });
    }
    return () => unsubscribe?.();
  }, []);

  // --- AUTO-PiP ON BLUR IMPL ---
  const isPlayingRef = useRef(state.isPlaying);
  const isPausedRef = useRef(state.isPaused);
  useEffect(() => {
    isPlayingRef.current = state.isPlaying;
    isPausedRef.current = state.isPaused;
  }, [state.isPlaying, state.isPaused]);

  // --- NATIVE OS: KEEP AWAKE DURING PLAYBACK ---
  useEffect(() => {
    if (checkIsDesktop() && desktopBridge.setKeepAwake) {
      if (state.isPlaying && !state.isPaused) {
        desktopBridge.setKeepAwake(true);
      } else {
        desktopBridge.setKeepAwake(false);
      }
    }
    // Cleanup on unmount or URL change
    return () => {
      if (checkIsDesktop() && desktopBridge.setKeepAwake) {
        desktopBridge.setKeepAwake(false);
      }
    };
  }, [state.isPlaying, state.isPaused]);

  // --- REACT-SIDE NATIVE FULLSCREEN GUARD ---
  // Tracks whether the Electron window is currently in (or transitioning out of)
  // OS native fullscreen. The main process sends 'window-fullscreen-changed'
  // on enter-full-screen and leave-full-screen events, and also suppresses
  // blur IPC during the transition. This ref is the React-side backstop.
  const isNativeFullscreenRef = useRef(false);
  const fullscreenExitGraceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !checkIsDesktop() ||
      !desktopBridge.onWindowFullscreenChanged
    ) {
      return;
    }
    const unsubscribe = desktopBridge.onWindowFullscreenChanged((isFs) => {
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: isFs });
      if (isFs) {
        // Entering fullscreen — clear any pending grace timer and mark as fullscreen.
        if (fullscreenExitGraceRef.current) {
          clearTimeout(fullscreenExitGraceRef.current);
          fullscreenExitGraceRef.current = null;
        }
        isNativeFullscreenRef.current = true;
      } else {
        // Leaving fullscreen — hold the flag for a short grace period to absorb
        // any trailing blur event from the OS animation (~300 ms on macOS).
        fullscreenExitGraceRef.current = setTimeout(() => {
          isNativeFullscreenRef.current = false;
          fullscreenExitGraceRef.current = null;
        }, 350);
      }
    });
    return () => {
      unsubscribe();
      if (fullscreenExitGraceRef.current)
        clearTimeout(fullscreenExitGraceRef.current);
    };
  }, []);

  useEffect(() => {
    let unsubscribeBlur: (() => void) | undefined;
    let unsubscribeFocus: (() => void) | undefined;

    if (checkIsDesktop()) {
      if (desktopBridge.onWindowBlur) {
        unsubscribeBlur = desktopBridge.onWindowBlur(() => {
          // Guard 0: Don't re-trigger if already in PiP mode
          if (isPipRef.current) return;

          // Guard 1: Never auto-PiP during a native OS fullscreen transition.
          // The main process already suppresses blur IPC in this case, but this
          // ref acts as a belt-and-suspenders backstop for the React side.
          if (isNativeFullscreenRef.current) return;

          // Guard 2: Never auto-PiP during active navigation to another page.
          // This prevents the infinite zoom-in/out loop when clicking 'Back'.
          if (isNavigatingRef.current) return;

          // Guard 3: Only Auto-PiP if we are actively playing media.
          if (isPlayingRef.current && !isPausedRef.current) {
            desktopBridge.setPictureInPicture(true, 1.0);
          }
        });
      }

      if (desktopBridge.onWindowFocus) {
        unsubscribeFocus = desktopBridge.onWindowFocus(() => {
          // Restore window normally when user comes back
          desktopBridge.setPictureInPicture(false);
        });
      }
    }

    return () => {
      unsubscribeBlur?.();
      unsubscribeFocus?.();
    };
  }, []);

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
