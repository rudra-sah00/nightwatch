import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EqualizerBand, RepeatMode } from '../engine/types';
import type { MusicTrack } from '../types';

interface MusicState {
  // Playback state
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  progress: number;
  duration: number;
  crossfadeDuration: number;
  gapless: boolean;
  sleepTimerEnd: number | null;
  expanded: boolean;

  // Remote control
  isRemoteControlling: boolean;
  remoteTrack: MusicTrack | null;
  remoteIsPlaying: boolean;
  remoteProgress: number;
  remoteDuration: number;
  remoteQueue: MusicTrack[];

  // Actions
  play: (track: MusicTrack, queue?: MusicTrack[], startAt?: number) => void;
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
  setCrossfadeDuration: (seconds: number) => void;
  setGapless: (enabled: boolean) => void;
  initEqualizer: () => void;
  setEqBands: (bands: EqualizerBand[]) => void;
  getEqBands: () => EqualizerBand[];
  setSleepTimer: (minutes: number) => void;
  setRemoteControlling: (
    active: boolean,
    track?: MusicTrack | null,
    playing?: boolean,
    progress?: number,
    duration?: number,
    queue?: MusicTrack[],
  ) => void;

  // Internal — called by engine subscriber
  _setEngineState: (partial: Partial<MusicState>) => void;
  _setProgress: (progress: number, duration: number) => void;
  reset: () => void;
}

const initialState = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 1,
  shuffle: false,
  repeat: 'off' as RepeatMode,
  progress: 0,
  duration: 0,
  crossfadeDuration: 0,
  gapless: true,
  sleepTimerEnd: null,
  expanded: false,
  isRemoteControlling: false,
  remoteTrack: null,
  remoteIsPlaying: false,
  remoteProgress: 0,
  remoteDuration: 0,
  remoteQueue: [],
};

/**
 * Zustand store for music player state.
 *
 * The AudioEngine remains a singleton class and subscribes to this store
 * for commands. Engine state changes flow back via `_setEngineState` and
 * `_setProgress`. Persists volume, shuffle, repeat, gapless, crossfade.
 */
export const useMusicStore = create<MusicState>()(
  persist(
    (set, _get) => ({
      ...initialState,

      // These actions delegate to the AudioEngine singleton.
      // The engine is connected via `connectMusicEngine()` below.
      play: () => {},
      togglePlay: () => {},
      next: () => {},
      prev: () => {},
      seek: () => {},
      toggleShuffle: () => {},
      cycleRepeat: () => {},
      setVolume: () => {},
      stop: () => set({ expanded: false }),
      setExpanded: (v) => set({ expanded: v }),
      addToQueue: () => {},
      playNext: () => {},
      removeFromQueue: () => {},
      showAirPlay: () => {},
      setCrossfadeDuration: () => {},
      setGapless: () => {},
      initEqualizer: () => {},
      setEqBands: () => {},
      getEqBands: () => [],
      setSleepTimer: () => {},
      setRemoteControlling: (active, track, playing, prog, dur, q) =>
        set((s) => ({
          isRemoteControlling: active,
          remoteTrack: track !== undefined ? (track ?? null) : s.remoteTrack,
          remoteIsPlaying: playing !== undefined ? playing : s.remoteIsPlaying,
          remoteProgress: prog !== undefined ? prog : s.remoteProgress,
          remoteDuration: dur !== undefined ? dur : s.remoteDuration,
          remoteQueue: q !== undefined ? q : s.remoteQueue,
        })),

      _setEngineState: (partial) => set(partial),
      _setProgress: (progress, duration) => set({ progress, duration }),
      reset: () => set(initialState),
    }),
    {
      name: 'nightwatch_music',
      partialize: (s) => ({
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
        crossfadeDuration: s.crossfadeDuration,
        gapless: s.gapless,
      }),
    },
  ),
);

/**
 * Connect the AudioEngine singleton to the Zustand store.
 * Call once on app init (inside MusicEngineInit or a top-level effect).
 * Returns a cleanup function.
 */
export function connectMusicEngine(
  engine: import('../engine/audio-engine').AudioEngine,
) {
  // Wire action dispatchers to engine methods
  useMusicStore.setState({
    play: (track, queue, startAt) => engine.playTrack(track, queue, startAt),
    togglePlay: () => engine.togglePlay(),
    next: () => engine.next(),
    prev: () => engine.prev(),
    seek: (p) => engine.seek(p),
    toggleShuffle: () => engine.toggleShuffle(),
    cycleRepeat: () => engine.cycleRepeat(),
    setVolume: (v) => engine.setVolume(v),
    stop: () => {
      engine.stop();
      useMusicStore.setState({ expanded: false });
    },
    addToQueue: (track) => engine.addToQueue(track),
    playNext: (track) => engine.playNext(track),
    removeFromQueue: (index) => engine.removeFromQueue(index),
    showAirPlay: async () => {
      const audio = engine.getAudioElement() as
        | (HTMLAudioElement & { webkitShowPlaybackTargetPicker?: () => void })
        | undefined;
      if (audio?.webkitShowPlaybackTargetPicker) {
        audio.webkitShowPlaybackTargetPicker();
        return;
      }
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
        } catch {}
      }
      toast.info(
        "Use your device's Bluetooth or audio settings to switch output devices.",
      );
    },
    setCrossfadeDuration: (s) => engine.setCrossfadeDuration(s),
    setGapless: (v) => engine.setGapless(v),
    initEqualizer: () => engine.initEqualizer(),
    setEqBands: (b) => engine.setEqBands(b),
    getEqBands: () => engine.getEqBands(),
    setSleepTimer: (m) => {
      if (m <= 0) engine.clearSleepTimer();
      else engine.setSleepTimer(m);
    },
  });

  // Apply persisted preferences to engine
  const persisted = useMusicStore.getState();
  engine.setVolume(persisted.volume);
  if (persisted.crossfadeDuration) {
    engine.setCrossfadeDuration(persisted.crossfadeDuration);
  }
  engine.setGapless(persisted.gapless);
  if (persisted.shuffle) {
    engine.toggleShuffle();
  }
  if (persisted.repeat !== 'off') {
    // Cycle to the persisted mode
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const target = modes.indexOf(persisted.repeat);
    for (let i = 0; i < target; i++) engine.cycleRepeat();
  }

  // Subscribe to engine state changes
  let prevProgress = 0;
  let prevDuration = 0;
  let prevTrackId: string | null = null;
  let prevIsPlaying = false;
  let prevShuffle = false;
  let prevRepeat: string = 'off';
  let prevVolume = 1;
  let prevCrossfade = 0;
  let prevGapless = true;
  let prevSleepEnd: number | null = null;
  let prevQueue: MusicTrack[] = [];

  const unsub = engine.subscribe((s) => {
    if (s.progress !== prevProgress || s.duration !== prevDuration) {
      prevProgress = s.progress;
      prevDuration = s.duration;
      useMusicStore.getState()._setProgress(s.progress, s.duration);
    }
    if (
      s.currentTrack?.id !== prevTrackId ||
      s.isPlaying !== prevIsPlaying ||
      s.queue !== prevQueue ||
      s.shuffle !== prevShuffle ||
      s.repeat !== prevRepeat ||
      s.volume !== prevVolume ||
      s.crossfadeDuration !== prevCrossfade ||
      s.gapless !== prevGapless ||
      s.sleepTimerEnd !== prevSleepEnd
    ) {
      prevTrackId = s.currentTrack?.id ?? null;
      prevIsPlaying = s.isPlaying;
      prevQueue = s.queue;
      prevShuffle = s.shuffle;
      prevRepeat = s.repeat;
      prevVolume = s.volume;
      prevCrossfade = s.crossfadeDuration;
      prevGapless = s.gapless;
      prevSleepEnd = s.sleepTimerEnd;
      useMusicStore.getState()._setEngineState({
        currentTrack: s.currentTrack,
        queue: s.queue,
        isPlaying: s.isPlaying,
        shuffle: s.shuffle,
        repeat: s.repeat as RepeatMode,
        volume: s.volume,
        crossfadeDuration: s.crossfadeDuration,
        gapless: s.gapless,
        sleepTimerEnd: s.sleepTimerEnd,
      });
    }
  });

  engine.loadQueue();
  return unsub;
}
