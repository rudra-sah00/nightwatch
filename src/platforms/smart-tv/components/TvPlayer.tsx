'use client';

import {
  FocusContext,
  pause as pauseNav,
  resume as resumeNav,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  initialPlayerState,
  playerReducer,
  type SubtitleTrack,
  type VideoMetadata,
} from '@/features/watch/player/context/types';
import { usePlayerEngine } from '@/features/watch/player/hooks/usePlayerEngine';
import { useWatchProgress } from '@/features/watch/player/hooks/useWatchProgress';
import { useTvRemoteReceiver } from '../hooks/use-tv-remote-receiver';
import { TvPlayerControls } from './TvPlayerControls';
import { TvPlayerOverlay } from './TvPlayerOverlay';

export interface TvPlayerProps {
  streamUrl: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  isLive?: boolean;
  qualities?: { quality: string; url: string }[];
  subtitleTracks?: SubtitleTrack[];
  onStreamExpired?: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onExit?: () => void;
  participants?: { id: string; name: string; profilePhoto?: string }[];
  isHost?: boolean;
  onPartyEvent?: (event: { eventType: string; videoTime: number }) => void;
  isClipping?: boolean;
  clipDuration?: number;
  onClipStart?: () => void;
  onClipStop?: () => void;
  metadata?: VideoMetadata;
}

const CONTROLS_TIMEOUT = 5000;
const NEXT_EP_COUNTDOWN = 10;

export function TvPlayer({
  streamUrl,
  title,
  subtitle,
  posterUrl,
  isLive,
  qualities,
  subtitleTracks,
  onStreamExpired,
  onNextEpisode,
  onPrevEpisode,
  onExit,
  participants,
  onPartyEvent,
  isClipping,
  clipDuration,
  onClipStart,
  onClipStop,
  metadata,
}: TvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [activePanel, setActivePanel] = useState<
    'none' | 'quality' | 'subtitle' | 'audio' | 'speed'
  >('none');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Refs for callbacks to avoid stale closures in video event bindings
  const onPartyEventRef = useRef(onPartyEvent);
  onPartyEventRef.current = onPartyEvent;
  const onNextEpisodeRef = useRef(onNextEpisode);
  onNextEpisodeRef.current = onNextEpisode;
  const titleRef = useRef(title);
  titleRef.current = title;

  const tPlayer = useTranslations('common.tv.player');
  const errorMsgRef = useRef(tPlayer('error'));
  errorMsgRef.current = tPlayer('error');

  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_PLAYER',
    trackChildren: true,
  });

  // Remote control receiver — allows mobile to control this TV player
  useTvRemoteReceiver({
    videoRef,
    title,
    type: isLive ? 'livestream' : 'movie',
    onNextEpisode,
  });

  useWatchProgress({
    videoRef,
    metadata: metadata ?? {
      title,
      type: isLive ? 'livestream' : 'movie',
      movieId: '',
    },
    isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
    skipProgressHistory: !metadata,
  });

  const { setQuality, setAudioTrack } = usePlayerEngine({
    videoRef,
    streamUrl,
    dispatch,
    onStreamExpired,
    qualities,
    isLive,
  });

  // Inject subtitle tracks into state
  useEffect(() => {
    if (subtitleTracks?.length) {
      dispatch({ type: 'SET_SUBTITLE_TRACKS', subtitleTracks });
    }
  }, [subtitleTracks]);

  // Video element event bindings (uses refs, no stale closures)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const emitParty = (type: string) => {
      if (onPartyEventRef.current && v) {
        onPartyEventRef.current({ eventType: type, videoTime: v.currentTime });
      }
    };

    const onPlay = () => {
      dispatch({ type: 'PLAY' });
      emitParty('play');
    };
    const onPause = () => {
      dispatch({ type: 'PAUSE' });
      emitParty('pause');
    };
    const onTime = () => dispatch({ type: 'SET_TIME', time: v.currentTime });
    const onMeta = () =>
      dispatch({ type: 'SET_DURATION', duration: v.duration });
    const onWaiting = () =>
      dispatch({ type: 'SET_BUFFERING', isBuffering: true });
    const onCanPlay = () => {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_BUFFERING', isBuffering: false });
    };
    const onError = () => {
      dispatch({ type: 'SET_ERROR', error: errorMsgRef.current });
      import('@/lib/analytics').then(({ reportError, trackEvent }) => {
        reportError(`[TV Player] Playback error`);
        trackEvent('video_error', { title: titleRef.current, platform: 'tv' });
      });
    };
    const onEnded = () => {
      import('@/lib/analytics').then(({ trackEvent }) => {
        trackEvent('video_complete', {
          title: titleRef.current,
          platform: 'tv',
        });
      });
      if (onNextEpisodeRef.current) {
        // Start countdown instead of immediate transition
        setCountdown(NEXT_EP_COUNTDOWN);
      }
    };

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  // Auto-play countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      onNextEpisodeRef.current?.();
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Media key support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case 'MediaPlayPause':
          e.preventDefault();
          if (v.paused) v.play();
          else v.pause();
          break;
        case 'MediaRewind':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case 'MediaFastForward':
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          break;
        case 'MediaStop':
          e.preventDefault();
          v.pause();
          onExit?.();
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit]);

  // Show/hide controls
  const showControls = useCallback(() => {
    dispatch({ type: 'SHOW_CONTROLS' });
    setActivePanel('none');
    resumeNav();
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      dispatch({ type: 'HIDE_CONTROLS' });
      setActivePanel('none');
      pauseNav();
    }, CONTROLS_TIMEOUT);
  }, []);

  useEffect(() => {
    showControls();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack') {
        e.preventDefault();
        e.stopPropagation();
        if (countdown !== null) {
          setCountdown(null);
          return;
        }
        if (activePanel !== 'none') {
          setActivePanel('none');
          return;
        }
        if (state.showControls) {
          dispatch({ type: 'HIDE_CONTROLS' });
          pauseNav();
          return;
        }
        onExit?.();
        return;
      }
      showControls();
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      clearTimeout(hideTimerRef.current);
      resumeNav();
    };
  }, [showControls, onExit, activePanel, state.showControls, countdown]);

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const seek = useCallback(
    (time: number) => {
      const v = videoRef.current;
      if (!v) return;
      if (isLive) {
        const src = v.seekable.length > 0 ? v.seekable : v.buffered;
        if (src.length) {
          const start = src.start(0);
          const end = src.end(src.length - 1);
          v.currentTime = Math.max(start, Math.min(end, time));
        }
      } else {
        v.currentTime = Math.max(0, Math.min(v.duration || 0, time));
      }
      if (onPartyEventRef.current) {
        onPartyEventRef.current({
          eventType: 'seek',
          videoTime: v.currentTime,
        });
      }
    },
    [isLive],
  );

  const handleQualityChange = useCallback(
    (index: number) => {
      setQuality(index);
      const q = state.qualities[index];
      dispatch({ type: 'SET_CURRENT_QUALITY', quality: q?.label || 'auto' });
      setActivePanel('none');
      import('@/lib/analytics').then(({ trackEvent }) => {
        trackEvent('video_quality_switch', {
          quality: state.qualities[index]?.label || 'auto',
          platform: 'tv',
        });
      });
    },
    [setQuality, state.qualities],
  );

  const handleAudioTrackChange = useCallback(
    (trackId: string) => {
      setAudioTrack(trackId);
      dispatch({ type: 'SET_CURRENT_AUDIO_TRACK', trackId });
      setActivePanel('none');
    },
    [setAudioTrack],
  );

  const handleSubtitleChange = useCallback((trackId: string | null) => {
    dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId });
    setActivePanel('none');
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      const t = v.textTracks[i];
      t.mode = t.id === trackId ? 'showing' : 'hidden';
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
    dispatch({ type: 'SET_PLAYBACK_RATE', rate });
    setActivePanel('none');
  }, []);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });
    const v = videoRef.current;
    if (v) {
      v.load();
      v.play();
    }
  }, []);

  const trackElements = useMemo(() => {
    if (!subtitleTracks?.length) return null;
    return subtitleTracks.map((t) => (
      <track
        key={t.id}
        id={t.id}
        kind="subtitles"
        src={t.src}
        srcLang={t.language}
        label={t.label}
      />
    ));
  }, [subtitleTracks]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="relative w-full h-screen bg-black overflow-hidden"
      >
        <video
          ref={videoRef}
          autoPlay
          poster={posterUrl || undefined}
          className="w-full h-full object-contain"
        >
          {trackElements}
          <track kind="captions" default />
        </video>

        {/* Buffering spinner */}
        {(state.isLoading || state.isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Info overlay (top) */}
        {state.showControls && (
          <TvPlayerOverlay
            title={title}
            subtitle={subtitle}
            participants={participants}
          />
        )}

        {/* Controls (bottom) */}
        {state.showControls && (
          <TvPlayerControls
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            duration={state.duration}
            isLive={isLive}
            qualities={state.qualities}
            currentQuality={state.currentQuality}
            subtitleTracks={state.subtitleTracks}
            currentSubtitleTrack={state.currentSubtitleTrack}
            activePanel={activePanel}
            hasNext={!!onNextEpisode}
            hasPrev={!!onPrevEpisode}
            isClipping={isClipping}
            clipDuration={clipDuration}
            onClipToggle={isClipping ? onClipStop : onClipStart}
            onPlayPause={togglePlayPause}
            onSeek={seek}
            onNext={onNextEpisode}
            onPrev={onPrevEpisode}
            onQualityChange={handleQualityChange}
            onSubtitleChange={handleSubtitleChange}
            onOpenPanel={setActivePanel}
            audioTracks={state.audioTracks}
            currentAudioTrack={state.currentAudioTrack}
            onAudioTrackChange={handleAudioTrackChange}
            playbackRate={state.playbackRate}
            onPlaybackRateChange={handlePlaybackRateChange}
          />
        )}

        {/* Next episode countdown */}
        {countdown !== null && (
          <NextEpisodeCountdown
            seconds={countdown}
            onCancel={() => setCountdown(null)}
            onSkip={() => {
              setCountdown(null);
              onNextEpisodeRef.current?.();
            }}
          />
        )}

        {/* Error with retry */}
        {state.error && (
          <ErrorOverlay
            error={state.error}
            onRetry={handleRetry}
            onExit={onExit}
          />
        )}
      </div>
    </FocusContext.Provider>
  );
}

// ─── Next Episode Countdown ───
function NextEpisodeCountdown({
  seconds,
  onCancel,
  onSkip,
}: {
  seconds: number;
  onCancel: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focused: cancelFocused } = useFocusable({
    onEnterPress: onCancel,
  });
  const { ref: skipRef, focused: skipFocused } = useFocusable({
    onEnterPress: onSkip,
  });
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
      <div className="text-center">
        <p className="text-white/60 text-lg mb-2">{t('nextIn')}</p>
        <p className="text-6xl font-bold text-white mb-6">{seconds}</p>
        <div className="flex gap-4 justify-center">
          <button
            ref={skipRef}
            type="button"
            className={`px-6 py-3 rounded-xl font-bold transition-all ${skipFocused ? 'bg-tv-focus text-white scale-105' : 'bg-white/20 text-white'}`}
          >
            {t('playNow')}
          </button>
          <button
            ref={ref}
            type="button"
            className={`px-6 py-3 rounded-xl font-bold transition-all ${cancelFocused ? 'bg-white text-black scale-105' : 'bg-white/10 text-white/70'}`}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Error Overlay with Retry ───
function ErrorOverlay({
  error,
  onRetry,
  onExit,
}: {
  error: string;
  onRetry: () => void;
  onExit?: () => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focused: retryFocused } = useFocusable({
    onEnterPress: onRetry,
  });
  const { ref: exitRef, focused: exitFocused } = useFocusable({
    onEnterPress: () => onExit?.(),
  });
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
      <div className="text-center max-w-md">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">
          error
        </span>
        <p className="text-red-400 text-lg mb-6">{error}</p>
        <div className="flex gap-4 justify-center">
          <button
            ref={ref}
            type="button"
            className={`px-6 py-3 rounded-xl font-bold transition-all ${retryFocused ? 'bg-tv-focus text-white scale-105' : 'bg-white/20 text-white'}`}
          >
            {t('retry')}
          </button>
          {onExit && (
            <button
              ref={exitRef}
              type="button"
              className={`px-6 py-3 rounded-xl font-bold transition-all ${exitFocused ? 'bg-white text-black scale-105' : 'bg-white/10 text-white/70'}`}
            >
              {t('goBack')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
