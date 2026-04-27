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
import type { MusicTrack } from '../api';
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
    return () => {
      unsub();
      engine.destroy();
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
