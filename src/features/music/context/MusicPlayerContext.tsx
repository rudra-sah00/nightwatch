'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import type { MusicTrack } from '../api';
import { getSong } from '../api';
import {
  AudioEngine,
  type AudioEngineState,
  type RepeatMode,
} from '../engine/audio-engine';
import { useMusicProgress } from '../hooks/use-music-progress';

/**
 * Shape of the value exposed by {@link MusicPlayerProvider} via React Context.
 *
 * This is the **React-facing API** for music playback. It mirrors the
 * {@link AudioEngineState} fields and adds UI-specific state (`expanded`)
 * plus stable callback wrappers around the underlying {@link AudioEngine} methods.
 */
interface MusicPlayerContextValue {
  /** Currently loaded track, or `null` when idle. */
  currentTrack: MusicTrack | null;
  /** Ordered playback queue. */
  queue: MusicTrack[];
  /** Whether audio is actively playing. */
  isPlaying: boolean;
  /** Playback progress as a percentage (0–100). */
  progress: number;
  /** Duration of the current track in seconds. */
  duration: number;
  /** Whether shuffle mode is active. */
  shuffle: boolean;
  /** Current repeat mode (`'off'` | `'all'` | `'one'`). */
  repeat: RepeatMode;
  /** Whether the full-screen / expanded player UI is open. */
  expanded: boolean;
  /** Volume level from 0 (muted) to 1 (max). */
  volume: number;
  /** Start playing a track, optionally replacing the queue. */
  play: (track: MusicTrack, queue?: MusicTrack[], startAt?: number) => void;
  /** Toggle play / pause. */
  togglePlay: () => void;
  /** Skip to the next track. */
  next: () => void;
  /** Go to the previous track (or restart if >3 s elapsed). */
  prev: () => void;
  /** Seek to a percentage position (0–100). */
  seek: (percent: number) => void;
  /** Toggle shuffle on/off. */
  toggleShuffle: () => void;
  /** Cycle repeat mode: off → all → one → off. */
  cycleRepeat: () => void;
  /** Set volume (0–1). */
  setVolume: (v: number) => void;
  /** Stop playback and collapse the player. */
  stop: () => void;
  /** Open or close the expanded player UI. */
  setExpanded: (v: boolean) => void;
  /** Append a track to the end of the queue. */
  addToQueue: (track: MusicTrack) => void;
  /** Insert a track right after the current one. */
  playNext: (track: MusicTrack) => void;
  /** Remove a track from the queue by index. */
  removeFromQueue: (index: number) => void;
  /** Show the native AirPlay / audio-output picker (Safari, Chrome, or fallback toast). */
  showAirPlay: () => void;
  /** Set crossfade duration in seconds (0 = off). */
  setCrossfadeDuration: (seconds: number) => void;
  /** Enable/disable gapless playback. */
  setGapless: (enabled: boolean) => void;
  /** Current crossfade duration. */
  crossfadeDuration: number;
  /** Whether gapless is enabled. */
  gapless: boolean;
  /** Initialize the equalizer (must be called after user gesture). */
  initEqualizer: () => void;
  /** Set equalizer band gains. */
  setEqBands: (bands: import('../engine/audio-engine').EqualizerBand[]) => void;
  /** Get current equalizer bands. */
  getEqBands: () => import('../engine/audio-engine').EqualizerBand[];
  /** Set sleep timer in minutes (0 = cancel). */
  setSleepTimer: (minutes: number) => void;
  /** Timestamp when sleep timer ends, or null. */
  sleepTimerEnd: number | null;
  /** Whether playback is being controlled on another device. */
  isRemoteControlling: boolean;
  /** Track info from the remote device (when controlling). */
  remoteTrack: import('../api').MusicTrack | null;
  /** Whether the remote device is playing. */
  remoteIsPlaying: boolean;
  /** Progress percentage from remote device. */
  remoteProgress: number;
  /** Duration in seconds from remote device. */
  remoteDuration: number;
  /** Queue from the remote device. */
  remoteQueue: import('../api').MusicTrack[];
  /** Set remote controlling state. */
  setRemoteControlling: (
    active: boolean,
    track?: import('../api').MusicTrack | null,
    playing?: boolean,
    progress?: number,
    duration?: number,
    queue?: import('../api').MusicTrack[],
  ) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioEngineState>({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
    volume: 1,
    crossfadeDuration: 0,
    gapless: true,
    sleepTimerEnd: null,
  });
  const [expanded, setExpanded] = useState(false);
  const [remoteState, setRemoteState] = useState<{
    controlling: boolean;
    track: MusicTrack | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    queue: MusicTrack[];
  }>({
    controlling: false,
    track: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    queue: [],
  });

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    const unsub = engine.subscribe(setState);
    engine.loadQueue();

    // Listen for settings changes from AppPreferences
    const onGapless = (e: Event) => {
      engine.setGapless((e as CustomEvent).detail);
    };
    const onCrossfade = (e: Event) => {
      engine.setCrossfadeDuration((e as CustomEvent).detail);
    };
    window.addEventListener('music:set-gapless', onGapless);
    window.addEventListener('music:set-crossfade', onCrossfade);

    return () => {
      unsub();
      window.removeEventListener('music:set-gapless', onGapless);
      window.removeEventListener('music:set-crossfade', onCrossfade);
      engine.destroy();
    };
  }, []);

  // Track daily listening time
  useMusicProgress({ isPlaying: state.isPlaying });

  // Stop local playback when another device takes over
  useEffect(() => {
    const onTakeover = () => {
      engineRef.current?.stop();
    };
    window.addEventListener('music:remote-takeover', onTakeover);
    return () =>
      window.removeEventListener('music:remote-takeover', onTakeover);
  }, []);

  // Listen for Ask AI music play requests (no navigation needed)
  const duckVolRef = useRef(-1);
  useEffect(() => {
    const handleSong = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.track) {
        engineRef.current?.playTrack(detail.track, [detail.track]);
      } else if (detail.songId) {
        getSong(detail.songId)
          .then((song) => {
            if (song) engineRef.current?.playTrack(song, [song]);
          })
          .catch(() => {});
      }
    };
    const handlePlaylist = (e: Event) => {
      const { tracks } = (e as CustomEvent).detail as { tracks: MusicTrack[] };
      if (tracks?.length) {
        engineRef.current?.playTrack(tracks[0], tracks);
      }
    };
    const handleControl = (e: Event) => {
      const { action } = (e as CustomEvent).detail as { action: string };
      const engine = engineRef.current;
      if (!engine) return;
      switch (action) {
        case 'pause':
          engine.togglePlay();
          break;
        case 'resume':
          engine.togglePlay();
          break;
        case 'next':
          engine.next();
          break;
        case 'previous':
          engine.prev();
          break;
        case 'stop':
          engine.stop();
          break;
      }
    };
    const handleDuck = (e: Event) => {
      const { duck } = (e as CustomEvent).detail as { duck: boolean };
      const engine = engineRef.current;
      if (!engine) return;
      const currentVol = engine.getState().volume;
      if (duck) {
        duckVolRef.current = currentVol;
        engine.setVolume(Math.min(currentVol * 0.15, 0.1));
      } else if (duckVolRef.current >= 0) {
        engine.setVolume(duckVolRef.current);
        duckVolRef.current = -1;
      }
    };
    window.addEventListener('ask-ai:play-music', handleSong);
    window.addEventListener('ask-ai:play-playlist', handlePlaylist);
    window.addEventListener('ask-ai:music-control', handleControl);
    window.addEventListener('ask-ai:duck', handleDuck);
    return () => {
      window.removeEventListener('ask-ai:play-music', handleSong);
      window.removeEventListener('ask-ai:play-playlist', handlePlaylist);
      window.removeEventListener('ask-ai:music-control', handleControl);
      window.removeEventListener('ask-ai:duck', handleDuck);
    };
  }, []);

  // Pause music when a DM voice call arrives, resume when it ends
  const wasPlayingBeforeCallRef = useRef(false);
  useEffect(() => {
    const handleCallStart = () => {
      const engine = engineRef.current;
      if (!engine) return;
      const s = engine.getState();
      wasPlayingBeforeCallRef.current = s.isPlaying;
      if (s.isPlaying) engine.togglePlay();
    };
    const handleCallEnd = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (wasPlayingBeforeCallRef.current && !engine.getState().isPlaying) {
        engine.togglePlay();
      }
      wasPlayingBeforeCallRef.current = false;
    };
    window.addEventListener('dm-call:start', handleCallStart);
    window.addEventListener('dm-call:end', handleCallEnd);
    return () => {
      window.removeEventListener('dm-call:start', handleCallStart);
      window.removeEventListener('dm-call:end', handleCallEnd);
    };
  }, []);

  // Broadcast music activity to friends
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket?.connected) return;

    const emitActivity = () => {
      if (state.currentTrack) {
        socket.emit('watch:set_activity', {
          type: 'music',
          title: state.currentTrack.title,
          artist: state.currentTrack.artist ?? null,
          season: null,
          episode: null,
          episodeTitle: null,
          posterUrl: state.currentTrack.image ?? null,
          secondaryPosterUrl: null,
        });
      }
    };

    let intervalId: NodeJS.Timeout;

    if (state.isPlaying && state.currentTrack) {
      // Emit immediately on play
      emitActivity();
      // Heartbeat every 3 minutes
      intervalId = setInterval(emitActivity, 3 * 60 * 1000);
    } else if (!state.currentTrack) {
      // If queue finishes or track is cleared, clear immediately
      socket.emit('watch:clear_activity');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socket, state.isPlaying, state.currentTrack]);

  // Always clear on unmount
  useEffect(() => {
    return () => {
      socket?.emit('watch:clear_activity');
    };
  }, [socket]);

  const play = useCallback((track: MusicTrack, queue?: MusicTrack[], startAt?: number) => {
    engineRef.current?.playTrack(track, queue, startAt);
  }, []);

  const togglePlay = useCallback(() => engineRef.current?.togglePlay(), []);
  const next = useCallback(() => engineRef.current?.next(), []);
  const prev = useCallback(() => engineRef.current?.prev(), []);
  const seek = useCallback((p: number) => engineRef.current?.seek(p), []);
  const toggleShuffle = useCallback(
    () => engineRef.current?.toggleShuffle(),
    [],
  );
  const cycleRepeat = useCallback(() => engineRef.current?.cycleRepeat(), []);
  const setVolume = useCallback(
    (v: number) => engineRef.current?.setVolume(v),
    [],
  );
  const addToQueue = useCallback(
    (track: MusicTrack) => engineRef.current?.addToQueue(track),
    [],
  );
  const playNext = useCallback(
    (track: MusicTrack) => engineRef.current?.playNext(track),
    [],
  );
  const removeFromQueue = useCallback(
    (index: number) => engineRef.current?.removeFromQueue(index),
    [],
  );
  const showAirPlay = useCallback(async () => {
    const audio = engineRef.current?.getAudioElement() as
      | (HTMLAudioElement & { webkitShowPlaybackTargetPicker?: () => void })
      | undefined;

    // iOS / macOS Safari — native AirPlay picker
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
      return;
    }

    // Chrome / Edge — Web Audio Output Devices API
    const md = navigator.mediaDevices as typeof navigator.mediaDevices & {
      selectAudioOutput?: () => Promise<MediaDeviceInfo>;
    };
    if (md?.selectAudioOutput) {
      try {
        const device = await md.selectAudioOutput();
        if (audio && 'setSinkId' in audio) {
          await (
            audio as HTMLAudioElement & {
              setSinkId: (id: string) => Promise<void>;
            }
          ).setSinkId(device.deviceId);
        }
        return;
      } catch {
        /* user cancelled or not supported */
      }
    }

    // Android / fallback — guide user to system audio settings
    toast.info(
      "Use your device's Bluetooth or audio settings to switch output devices.",
    );
  }, []);
  const stop = useCallback(() => {
    engineRef.current?.stop();
    setExpanded(false);
  }, []);

  const value = useMemo(
    () => ({
      currentTrack: state.currentTrack,
      queue: state.queue,
      isPlaying: state.isPlaying,
      progress: state.progress,
      duration: state.duration,
      shuffle: state.shuffle,
      repeat: state.repeat,
      expanded,
      volume: state.volume,
      play,
      togglePlay,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      stop,
      setExpanded,
      addToQueue,
      playNext,
      removeFromQueue,
      showAirPlay,
      crossfadeDuration: state.crossfadeDuration,
      gapless: state.gapless,
      sleepTimerEnd: state.sleepTimerEnd,
      setCrossfadeDuration: (s: number) =>
        engineRef.current?.setCrossfadeDuration(s),
      setGapless: (v: boolean) => engineRef.current?.setGapless(v),
      initEqualizer: () => engineRef.current?.initEqualizer(),
      setEqBands: (b: import('../engine/audio-engine').EqualizerBand[]) =>
        engineRef.current?.setEqBands(b),
      getEqBands: () => engineRef.current?.getEqBands() ?? [],
      setSleepTimer: (m: number) => {
        if (m <= 0) engineRef.current?.clearSleepTimer();
        else engineRef.current?.setSleepTimer(m);
      },
      isRemoteControlling: remoteState.controlling,
      remoteTrack: remoteState.track,
      remoteIsPlaying: remoteState.isPlaying,
      remoteProgress: remoteState.progress,
      remoteDuration: remoteState.duration,
      remoteQueue: remoteState.queue,
      setRemoteControlling: (
        active: boolean,
        track?: MusicTrack | null,
        playing?: boolean,
        prog?: number,
        dur?: number,
        q?: MusicTrack[],
      ) => {
        setRemoteState((prev) => ({
          controlling: active,
          track: track !== undefined ? (track ?? null) : prev.track,
          isPlaying: playing !== undefined ? playing : prev.isPlaying,
          progress: prog !== undefined ? prog : prev.progress,
          duration: dur !== undefined ? dur : prev.duration,
          queue: q !== undefined ? q : prev.queue,
        }));
      },
    }),
    [
      state,
      expanded,
      remoteState,
      play,
      togglePlay,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      stop,
      addToQueue,
      playNext,
      removeFromQueue,
      showAirPlay,
    ],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

/**
 * Consume the music player context.
 *
 * Must be called within a {@link MusicPlayerProvider}. Returns the full
 * {@link MusicPlayerContextValue} including playback state and control callbacks.
 *
 * @throws {Error} If called outside of a `MusicPlayerProvider`.
 *
 * @example
 * ```tsx
 * const { currentTrack, togglePlay, isPlaying } = useMusicPlayerContext();
 * ```
 */
export function useMusicPlayerContext() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error(
      'useMusicPlayerContext must be used within MusicPlayerProvider',
    );
  }
  return ctx;
}
