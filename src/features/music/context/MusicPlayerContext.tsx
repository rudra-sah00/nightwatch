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
import type { MusicTrack } from '../api';
import { getSong } from '../api';
import {
  AudioEngine,
  type AudioEngineState,
  type RepeatMode,
} from '../engine/audio-engine';

interface MusicPlayerContextValue {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  volume: number;
  play: (track: MusicTrack, queue?: MusicTrack[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (percent: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (v: number) => void;
  stop: () => void;
  setExpanded: (v: boolean) => void;
  addToQueue: (track: MusicTrack) => void;
  playNext: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  showAirPlay: () => void;
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
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    const unsub = engine.subscribe(setState);
    engine.loadQueue();
    return () => {
      unsub();
      engine.destroy();
    };
  }, []);

  // Listen for Ask AI music play requests (no navigation needed)
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
    const savedVolRef = { current: -1 };
    const handleDuck = (e: Event) => {
      const { duck } = (e as CustomEvent).detail as { duck: boolean };
      const engine = engineRef.current;
      if (!engine) return;
      if (duck) {
        savedVolRef.current = state.volume;
        engine.setVolume(Math.min(state.volume * 0.15, 0.1));
      } else if (savedVolRef.current >= 0) {
        engine.setVolume(savedVolRef.current);
        savedVolRef.current = -1;
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
  }, [state.volume]);

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

  const play = useCallback((track: MusicTrack, queue?: MusicTrack[]) => {
    engineRef.current?.playTrack(track, queue);
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
    }),
    [
      state,
      expanded,
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

export function useMusicPlayerContext() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error(
      'useMusicPlayerContext must be used within MusicPlayerProvider',
    );
  }
  return ctx;
}
