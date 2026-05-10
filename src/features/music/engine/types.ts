import type { MusicTrack } from '../api';

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioEngineState {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  crossfadeDuration: number;
  gapless: boolean;
  sleepTimerEnd: number | null;
}

export interface EqualizerBand {
  frequency: number;
  gain: number;
}

export const EQ_PRESETS: Record<string, EqualizerBand[]> = {
  flat: [
    { frequency: 60, gain: 0 },
    { frequency: 230, gain: 0 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 0 },
    { frequency: 14000, gain: 0 },
  ],
  bass: [
    { frequency: 60, gain: 6 },
    { frequency: 230, gain: 4 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: -1 },
    { frequency: 14000, gain: -2 },
  ],
  treble: [
    { frequency: 60, gain: -2 },
    { frequency: 230, gain: -1 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 4 },
    { frequency: 14000, gain: 6 },
  ],
  vocal: [
    { frequency: 60, gain: -2 },
    { frequency: 230, gain: 0 },
    { frequency: 910, gain: 4 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: 1 },
  ],
  rock: [
    { frequency: 60, gain: 5 },
    { frequency: 230, gain: 3 },
    { frequency: 910, gain: -1 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: 5 },
  ],
  electronic: [
    { frequency: 60, gain: 5 },
    { frequency: 230, gain: 3 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 2 },
    { frequency: 14000, gain: 4 },
  ],
  pop: [
    { frequency: 60, gain: -1 },
    { frequency: 230, gain: 2 },
    { frequency: 910, gain: 4 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: -1 },
  ],
  hiphop: [
    { frequency: 60, gain: 7 },
    { frequency: 230, gain: 4 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 1 },
    { frequency: 14000, gain: 3 },
  ],
  jazz: [
    { frequency: 60, gain: 3 },
    { frequency: 230, gain: 0 },
    { frequency: 910, gain: 2 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: 4 },
  ],
  classical: [
    { frequency: 60, gain: 0 },
    { frequency: 230, gain: 0 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: 5 },
  ],
  lofi: [
    { frequency: 60, gain: 3 },
    { frequency: 230, gain: 2 },
    { frequency: 910, gain: -2 },
    { frequency: 3600, gain: -1 },
    { frequency: 14000, gain: -3 },
  ],
  loudness: [
    { frequency: 60, gain: 6 },
    { frequency: 230, gain: 3 },
    { frequency: 910, gain: 0 },
    { frequency: 3600, gain: 3 },
    { frequency: 14000, gain: 6 },
  ],
};

/** Internal mutable context shared across engine sub-modules. */
export interface EngineContext {
  audio: HTMLAudioElement;
  nextAudio: HTMLAudioElement | null;
  state: AudioEngineState;
  playId: number;
  crossfadeActive: boolean;
  crossfadeAborted: boolean;
  shuffledOrder: number[];
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  sourceNodes: WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>;
  eqFilters: BiquadFilterNode[];
  eqBands: EqualizerBand[];
  sleepTimerHandle: ReturnType<typeof setTimeout> | null;
  progressInterval: ReturnType<typeof setInterval> | null;
  listeners: Set<(state: AudioEngineState) => void>;
  // Mutators
  update(partial: Partial<AudioEngineState>): void;
  setAudio(el: HTMLAudioElement): void;
  setNextAudio(el: HTMLAudioElement | null): void;
  incrementPlayId(): number;
}
