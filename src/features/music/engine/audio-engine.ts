import type { MusicTrack } from '../api';
import {
  addToUserQueue,
  getSongRecommendations,
  getStreamUrl,
  getUserQueue,
} from '../api';

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
};

type Listener = (state: AudioEngineState) => void;

export class AudioEngine {
  private audio: HTMLAudioElement;
  private nextAudio: HTMLAudioElement | null = null;
  private state: AudioEngineState;
  private listeners = new Set<Listener>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private shuffledOrder: number[] = [];
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;

  // Web Audio API for equalizer
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private eqBands: EqualizerBand[] = EQ_PRESETS.flat;

  constructor() {
    this.audio = new Audio();
    if (!window.Capacitor?.isNativePlatform?.()) {
      this.audio.disableRemotePlayback = true;
    }
    this.state = {
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
    };

    this.audio.onended = () => this.handleEnded();
    this.audio.onloadedmetadata = () => {
      this.update({ duration: this.audio.duration });
    };
  }

  /**
   * Register a listener that is called on every state change.
   *
   * @param fn - Callback receiving the latest {@link AudioEngineState}.
   * @returns An unsubscribe function — call it to remove the listener.
   */
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Returns the current immutable state snapshot.
   *
   * @returns The latest {@link AudioEngineState}.
   */
  getState() {
    return this.state;
  }

  /**
   * Returns the underlying `HTMLAudioElement` for direct access
   * (e.g. AirPlay picker, Web Audio API integration).
   *
   * @returns The internal audio element.
   */
  getAudioElement() {
    return this.audio;
  }

  private update(partial: Partial<AudioEngineState>) {
    this.state = { ...this.state, ...partial };
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    this.interval = setInterval(() => {
      if (this.audio.duration) {
        this.update({
          progress: (this.audio.currentTime / this.audio.duration) * 100,
        });
        // Gapless: pre-buffer next track when 5s from end
        if (
          this.state.gapless &&
          !this.state.crossfadeDuration &&
          this.audio.duration - this.audio.currentTime < 5 &&
          !this.nextAudio
        ) {
          this.preBufferNext();
        }
        // Crossfade: start crossfade when crossfadeDuration seconds from end
        if (
          this.state.crossfadeDuration > 0 &&
          this.audio.duration - this.audio.currentTime <=
            this.state.crossfadeDuration &&
          !this.nextAudio
        ) {
          this.startCrossfade();
        }
      }
    }, 250);
  }

  private stopProgressTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private getNextIndex(): number | null {
    const { queue, queueIndex, repeat, shuffle } = this.state;
    if (queue.length === 0) return null;
    if (shuffle && this.shuffledOrder.length > 0) {
      const pos = this.shuffledOrder.indexOf(queueIndex);
      const next = pos + 1;
      if (next >= this.shuffledOrder.length) {
        return repeat === 'all' ? this.shuffledOrder[0] : null;
      }
      return this.shuffledOrder[next];
    }
    const next = queueIndex + 1;
    if (next >= queue.length) {
      return repeat === 'all' ? 0 : null;
    }
    return next;
  }

  private async preBufferNext() {
    const nextIdx = this.getNextIndex();
    if (nextIdx === null) return;
    const nextTrack = this.state.queue[nextIdx];
    if (!nextTrack) return;
    try {
      const url = await getStreamUrl(nextTrack.id);
      this.nextAudio = new Audio();
      this.nextAudio.preload = 'auto';
      this.nextAudio.src = url;
      this.nextAudio.volume = this.state.volume;
    } catch {
      this.nextAudio = null;
    }
  }

  private async startCrossfade() {
    const nextIdx = this.getNextIndex();
    if (nextIdx === null) return;
    const nextTrack = this.state.queue[nextIdx];
    if (!nextTrack) return;

    try {
      const url = await getStreamUrl(nextTrack.id);
      this.nextAudio = new Audio();
      this.nextAudio.src = url;
      this.nextAudio.volume = 0;
      await this.nextAudio.play();

      const duration = this.state.crossfadeDuration * 1000;
      const steps = 30;
      const stepTime = duration / steps;

      // Fade out current, fade in next simultaneously
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        this.audio.volume = (1 - ratio) * this.state.volume;
        if (this.nextAudio) this.nextAudio.volume = ratio * this.state.volume;
        await new Promise((r) => setTimeout(r, stepTime));
      }

      // Swap audio elements
      this.audio.pause();
      this.audio.src = '';
      this.audio = this.nextAudio;
      this.nextAudio = null;
      this.audio.onended = () => this.handleEnded();
      this.audio.onloadedmetadata = () => {
        this.update({ duration: this.audio.duration });
      };
      this.connectEqualizer();
      this.update({
        currentTrack: nextTrack,
        queueIndex: nextIdx,
        duration: this.audio.duration || 0,
        progress: 0,
      });
    } catch {
      this.nextAudio = null;
    }
  }

  private generateShuffleOrder(length: number, currentIndex: number): number[] {
    const indices = Array.from({ length }, (_, i) => i).filter(
      (i) => i !== currentIndex,
    );
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return [currentIndex, ...indices];
  }

  private handleEnded() {
    this.stopProgressTimer();
    if (this.state.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      this.startProgressTimer();
      return;
    }
    // If crossfade already handled the transition, skip
    if (this.state.crossfadeDuration > 0) return;

    // Gapless: use pre-buffered audio if available
    if (this.state.gapless && this.nextAudio) {
      const nextIdx = this.getNextIndex();
      if (nextIdx !== null && this.state.queue[nextIdx]) {
        this.audio = this.nextAudio;
        this.nextAudio = null;
        this.audio.onended = () => this.handleEnded();
        this.audio.onloadedmetadata = () => {
          this.update({ duration: this.audio.duration });
        };
        this.audio.play();
        this.connectEqualizer();
        this.update({
          currentTrack: this.state.queue[nextIdx],
          queueIndex: nextIdx,
          isPlaying: true,
          progress: 0,
          duration: this.audio.duration || 0,
        });
        this.startProgressTimer();
        return;
      }
    }
    this.next();
  }

  private async fadeOut(duration = 500): Promise<void> {
    if (!this.audio.src || this.audio.paused) return;
    const steps = 20;
    const stepTime = duration / steps;
    for (let i = steps; i >= 0; i--) {
      this.audio.volume = (i / steps) * this.state.volume;
      await new Promise((r) => setTimeout(r, stepTime));
    }
    this.audio.pause();
    this.audio.volume = this.state.volume;
  }

  async playTrack(track: MusicTrack, queue?: MusicTrack[]) {
    console.log('[AudioEngine] playTrack called:', track.id, track.title);
    if (queue) {
      const idx = queue.findIndex((t) => t.id === track.id);
      this.update({ queue, queueIndex: idx >= 0 ? idx : 0 });
      if (this.state.shuffle) {
        this.shuffledOrder = this.generateShuffleOrder(
          queue.length,
          idx >= 0 ? idx : 0,
        );
      }
    }

    this.update({
      currentTrack: track,
      isPlaying: false,
      progress: 0,
      duration: 0,
    });

    try {
      // Crossfade: fade out current, load new, fade in
      await this.fadeOut(300);
      const url = await getStreamUrl(track.id);
      this.audio.src = url;
      this.audio.volume = 0;
      await this.audio.play();
      this.update({ isPlaying: true });
      this.startProgressTimer();
      // Fade in
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        this.audio.volume = (i / steps) * this.state.volume;
        await new Promise((r) => setTimeout(r, 15));
      }
    } catch {
      this.update({ isPlaying: false });
    }
  }

  togglePlay() {
    if (!this.state.currentTrack) return;
    if (this.state.isPlaying) {
      this.audio.pause();
      this.stopProgressTimer();
      this.update({ isPlaying: false });
    } else {
      this.audio.play();
      this.startProgressTimer();
      this.update({ isPlaying: true });
    }
  }

  seek(percent: number) {
    if (!this.audio.duration) return;
    this.audio.currentTime = (percent / 100) * this.audio.duration;
    this.update({ progress: percent });
  }

  async next() {
    const { queue, queueIndex, repeat, shuffle } = this.state;
    if (queue.length === 0) return;

    let nextIdx: number;
    if (shuffle && this.shuffledOrder.length > 0) {
      const currentShufflePos = this.shuffledOrder.indexOf(queueIndex);
      const nextShufflePos = currentShufflePos + 1;
      if (nextShufflePos >= this.shuffledOrder.length) {
        if (repeat === 'all') {
          this.shuffledOrder = this.generateShuffleOrder(
            queue.length,
            queueIndex,
          );
          nextIdx = this.shuffledOrder[0];
        } else {
          await this.autoContinue();
          return;
        }
      } else {
        nextIdx = this.shuffledOrder[nextShufflePos];
      }
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') {
          nextIdx = 0;
        } else {
          await this.autoContinue();
          return;
        }
      }
    }

    this.update({ queueIndex: nextIdx });
    await this.playTrack(queue[nextIdx]);
  }

  async prev() {
    // If more than 3 seconds in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      this.update({ progress: 0 });
      return;
    }

    const { queue, queueIndex } = this.state;
    if (queue.length === 0) return;

    const prevIdx = queueIndex - 1 < 0 ? queue.length - 1 : queueIndex - 1;
    this.update({ queueIndex: prevIdx });
    await this.playTrack(queue[prevIdx]);
  }

  toggleShuffle() {
    const shuffle = !this.state.shuffle;
    if (shuffle) {
      this.shuffledOrder = this.generateShuffleOrder(
        this.state.queue.length,
        this.state.queueIndex,
      );
    }
    this.update({ shuffle });
  }

  cycleRepeat() {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.state.repeat);
    this.update({ repeat: modes[(idx + 1) % modes.length] });
  }

  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    this.audio.volume = vol;
    this.update({ volume: vol });
  }

  stop() {
    this.audio.pause();
    this.audio.src = '';
    this.stopProgressTimer();
    this.update({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      queueIndex: -1,
    });
  }

  /** Auto-continue with recommendations when queue ends */
  private async autoContinue() {
    const track = this.state.currentTrack;
    if (!track) {
      this.stop();
      return;
    }
    try {
      const recs = await getSongRecommendations(track.id);
      if (recs.length > 0) {
        this.update({ queue: recs, queueIndex: 0 });
        await this.playTrack(recs[0]);
        return;
      }
    } catch {
      /* fall through */
    }
    this.stop();
  }

  // ─── Equalizer ─────────────────────────────────────────────────

  private connectEqualizer() {
    if (this.eqFilters.length === 0) return;
    // Reconnect source if audio element changed
    try {
      if (!this.audioContext) return;
      this.sourceNode?.disconnect();
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.eqFilters) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(this.audioContext.destination);
    } catch {
      // Already connected or context issue — ignore
    }
  }

  initEqualizer() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaElementSource(this.audio);

    // Create 5-band EQ
    this.eqFilters = this.eqBands.map((band, i) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type =
        i === 0
          ? 'lowshelf'
          : i === this.eqBands.length - 1
            ? 'highshelf'
            : 'peaking';
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      if (filter.type === 'peaking') filter.Q.value = 1.4;
      return filter;
    });

    // Connect chain: source → filter1 → filter2 → ... → destination
    let lastNode: AudioNode = this.sourceNode;
    for (const filter of this.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(this.audioContext.destination);
  }

  setEqBands(bands: EqualizerBand[]) {
    this.eqBands = bands;
    for (let i = 0; i < bands.length && i < this.eqFilters.length; i++) {
      this.eqFilters[i].gain.value = bands[i].gain;
    }
  }

  getEqBands(): EqualizerBand[] {
    return this.eqBands;
  }

  // ─── Sleep Timer ──────────────────────────────────────────────

  setSleepTimer(minutes: number) {
    this.clearSleepTimer();
    if (minutes <= 0) return;
    const end = Date.now() + minutes * 60 * 1000;
    this.update({ sleepTimerEnd: end });
    this.sleepTimer = setTimeout(
      () => {
        this.stop();
        this.update({ sleepTimerEnd: null });
      },
      minutes * 60 * 1000,
    );
  }

  clearSleepTimer() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    this.update({ sleepTimerEnd: null });
  }

  // ─── Settings ─────────────────────────────────────────────────

  setCrossfadeDuration(seconds: number) {
    this.update({ crossfadeDuration: Math.max(0, Math.min(12, seconds)) });
  }

  setGapless(enabled: boolean) {
    this.update({ gapless: enabled });
  }

  destroy() {
    this.stop();
    this.clearSleepTimer();
    this.audioContext?.close();
    this.listeners.clear();
  }

  /** Load persisted queue from backend Redis */
  async loadQueue() {
    try {
      const tracks = await getUserQueue();
      if (tracks.length > 0) {
        this.update({ queue: tracks });
      }
    } catch {
      /* ignore — offline or no queue */
    }
  }

  /** Add a track to the queue and persist to backend */
  async addToQueue(track: MusicTrack) {
    const queue = [...this.state.queue, track];
    this.update({ queue });
    try {
      await addToUserQueue(track);
    } catch {
      /* best-effort persist */
    }
  }

  /** Insert a track right after the currently playing track */
  playNext(track: MusicTrack) {
    const { queue, queueIndex } = this.state;
    const newQueue = [...queue];
    newQueue.splice(queueIndex + 1, 0, track);
    this.update({ queue: newQueue });
  }

  /**
   * Remove a track from the queue by its index.
   * Cannot remove the currently playing track. Adjusts `queueIndex` if the
   * removed track was before the current one.
   *
   * @param index - Zero-based index of the track to remove.
   */
  removeFromQueue(index: number) {
    const { queue, queueIndex } = this.state;
    if (index < 0 || index >= queue.length || index === queueIndex) return;
    const newQueue = queue.filter((_, i) => i !== index);
    const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex;
    this.update({ queue: newQueue, queueIndex: newIndex });
  }
}
