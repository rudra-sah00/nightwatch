import type { MusicTrack } from '../api';
import { abortCrossfade, startCrossfade } from './crossfade';
import {
  connectEqualizer,
  destroyEqualizer,
  getEqBands,
  initEqualizer,
  setEqBands,
} from './equalizer';
import { invalidatePreBuffer, preBufferNext } from './gapless';
import { autoContinue, playTrack } from './playback';
import {
  addToQueue,
  generateShuffleOrder,
  getNextIndex,
  getPrevIndex,
  loadQueue,
  playNextInQueue,
  removeFromQueue,
} from './queue';
import {
  checkSleepTimerExpired,
  clearSleepTimer,
  setSleepTimer,
} from './sleep-timer';
import {
  type AudioEngineState,
  type EngineContext,
  EQ_PRESETS,
  type EqualizerBand,
  type RepeatMode,
} from './types';

export {
  type AudioEngineState,
  EQ_PRESETS,
  type EqualizerBand,
  type RepeatMode,
} from './types';

type Listener = (state: AudioEngineState) => void;

export class AudioEngine {
  private ctx: EngineContext;

  constructor() {
    const audio = new Audio();
    if (!window.Capacitor?.isNativePlatform?.()) {
      audio.disableRemotePlayback = true;
    }

    const state: AudioEngineState = {
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

    this.ctx = {
      audio,
      nextAudio: null,
      state,
      playId: 0,
      crossfadeActive: false,
      crossfadeAborted: false,
      shuffledOrder: [],
      audioContext: null,
      sourceNode: null,
      sourceNodes: new WeakMap(),
      eqFilters: [],
      eqBands: EQ_PRESETS.flat,
      sleepTimerHandle: null,
      progressInterval: null,
      listeners: new Set(),
      update: (partial) => {
        this.ctx.state = { ...this.ctx.state, ...partial };
        for (const fn of this.ctx.listeners) fn(this.ctx.state);
      },
      setAudio: (el) => {
        this.ctx.audio = el;
        this.ctx.audio.onended = () => this.handleEnded();
        this.ctx.audio.onloadedmetadata = () => {
          this.ctx.update({ duration: this.ctx.audio.duration });
        };
      },
      setNextAudio: (el) => {
        this.ctx.nextAudio = el;
      },
      incrementPlayId: () => ++this.ctx.playId,
    };

    audio.onended = () => this.handleEnded();
    audio.onloadedmetadata = () =>
      this.ctx.update({ duration: audio.duration });

    // Load persisted settings
    try {
      const g = localStorage.getItem('nightwatch:gapless');
      if (g !== null) state.gapless = g !== 'false';
      const c = localStorage.getItem('nightwatch:crossfade');
      if (c !== null) state.crossfadeDuration = Number(c) || 0;
    } catch {
      /* ignore */
    }
  }

  subscribe(fn: Listener) {
    this.ctx.listeners.add(fn);
    return () => this.ctx.listeners.delete(fn);
  }

  getState() {
    return this.ctx.state;
  }

  getAudioElement() {
    return this.ctx.audio;
  }

  // ─── Progress Timer ────────────────────────────────────────────

  private startProgressTimer() {
    this.stopProgressTimer();
    this.ctx.progressInterval = setInterval(() => {
      if (checkSleepTimerExpired(this.ctx)) {
        clearSleepTimer(this.ctx);
        this.stop();
        return;
      }
      if (this.ctx.audio.duration) {
        this.ctx.update({
          progress:
            (this.ctx.audio.currentTime / this.ctx.audio.duration) * 100,
        });
        // Gapless pre-buffer 5s from end
        if (
          this.ctx.state.gapless &&
          !this.ctx.state.crossfadeDuration &&
          this.ctx.audio.duration - this.ctx.audio.currentTime < 5 &&
          !this.ctx.nextAudio
        ) {
          const idx = getNextIndex(this.ctx);
          if (idx !== null) preBufferNext(this.ctx, idx);
        }
        // Crossfade trigger — only if track has played past the crossfade duration
        // (prevents cascade when next track is shorter than crossfade duration)
        if (
          this.ctx.state.crossfadeDuration > 0 &&
          this.ctx.audio.currentTime > this.ctx.state.crossfadeDuration &&
          this.ctx.audio.duration - this.ctx.audio.currentTime <=
            this.ctx.state.crossfadeDuration &&
          !this.ctx.nextAudio &&
          !this.ctx.crossfadeActive
        ) {
          const idx = getNextIndex(this.ctx);
          if (idx !== null) {
            startCrossfade(
              this.ctx,
              idx,
              () => {},
              () => this.next(),
            );
          }
        }
      }
    }, 250);
  }

  private stopProgressTimer() {
    if (this.ctx.progressInterval) {
      clearInterval(this.ctx.progressInterval);
      this.ctx.progressInterval = null;
    }
  }

  // ─── Playback ─────────────────────────────────────────────────

  private handleEnded() {
    this.stopProgressTimer();
    if (this.ctx.state.repeat === 'one') {
      this.ctx.audio.currentTime = 0;
      this.ctx.audio.play().catch(() => this.ctx.update({ isPlaying: false }));
      this.startProgressTimer();
      return;
    }
    if (this.ctx.state.crossfadeDuration > 0 && this.ctx.crossfadeActive)
      return;

    // Gapless transition
    if (this.ctx.state.gapless && this.ctx.nextAudio) {
      const nextIdx = getNextIndex(this.ctx);
      if (nextIdx !== null && this.ctx.state.queue[nextIdx]) {
        this.ctx.setAudio(this.ctx.nextAudio);
        this.ctx.setNextAudio(null);
        if (this.ctx.audioContext?.state === 'suspended') {
          this.ctx.audioContext.resume().then(() => connectEqualizer(this.ctx));
        } else {
          connectEqualizer(this.ctx);
        }
        this.ctx.audio
          .play()
          .catch(() => this.ctx.update({ isPlaying: false }));
        this.ctx.update({
          currentTrack: this.ctx.state.queue[nextIdx],
          queueIndex: nextIdx,
          isPlaying: true,
          progress: 0,
          duration: this.ctx.audio.duration || 0,
        });
        this.startProgressTimer();
        return;
      }
    }
    this.next();
  }

  async playTrack(track: MusicTrack, queue?: MusicTrack[], startAt?: number) {
    abortCrossfade(this.ctx);
    invalidatePreBuffer(this.ctx);
    const myPlayId = this.ctx.incrementPlayId();

    if (queue) {
      const idx = queue.findIndex((t) => t.id === track.id);
      this.ctx.update({ queue, queueIndex: idx >= 0 ? idx : 0 });
      if (this.ctx.state.shuffle) {
        this.ctx.shuffledOrder = generateShuffleOrder(
          queue.length,
          idx >= 0 ? idx : 0,
        );
      }
    }

    await playTrack(this.ctx, track, startAt);
    if (this.ctx.playId === myPlayId && this.ctx.state.isPlaying) {
      this.startProgressTimer();
    }
  }

  togglePlay() {
    if (!this.ctx.state.currentTrack) return;
    if (this.ctx.state.isPlaying) {
      this.ctx.audio.pause();
      if (this.ctx.nextAudio && this.ctx.crossfadeActive) {
        this.ctx.nextAudio.pause();
      }
      this.stopProgressTimer();
      this.ctx.update({ isPlaying: false });
    } else {
      if (this.ctx.audioContext?.state === 'suspended') {
        this.ctx.audioContext.resume();
      }
      this.ctx.audio.play().catch(() => {
        this.stopProgressTimer();
        this.ctx.update({ isPlaying: false });
      });
      if (this.ctx.nextAudio && this.ctx.crossfadeActive) {
        this.ctx.nextAudio.play().catch(() => {});
      }
      this.startProgressTimer();
      this.ctx.update({ isPlaying: true });
    }
  }

  seek(percent: number) {
    if (!this.ctx.audio.duration) return;
    this.ctx.audio.currentTime = (percent / 100) * this.ctx.audio.duration;
    this.ctx.update({ progress: percent });
  }

  async next() {
    const { queue, queueIndex, repeat, shuffle } = this.ctx.state;
    if (queue.length === 0) return;

    let nextIdx: number;
    if (shuffle && this.ctx.shuffledOrder.length > 0) {
      const pos = this.ctx.shuffledOrder.indexOf(queueIndex);
      if (pos + 1 >= this.ctx.shuffledOrder.length) {
        if (repeat === 'all') {
          this.ctx.shuffledOrder = generateShuffleOrder(
            queue.length,
            queueIndex,
          );
          nextIdx = this.ctx.shuffledOrder[1] ?? this.ctx.shuffledOrder[0];
        } else {
          await autoContinue(
            this.ctx,
            () => this.stop(),
            (t) => this.playTrack(t),
          );
          return;
        }
      } else {
        nextIdx = this.ctx.shuffledOrder[pos + 1];
      }
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') {
          nextIdx = 0;
        } else {
          await autoContinue(
            this.ctx,
            () => this.stop(),
            (t) => this.playTrack(t),
          );
          return;
        }
      }
    }

    this.ctx.update({ queueIndex: nextIdx });
    await this.playTrack(queue[nextIdx]);
  }

  async prev() {
    if (this.ctx.audio.currentTime > 3) {
      this.ctx.audio.currentTime = 0;
      this.ctx.update({ progress: 0 });
      return;
    }
    const prevIdx = getPrevIndex(this.ctx);
    if (prevIdx === null) {
      this.ctx.audio.currentTime = 0;
      this.ctx.update({ progress: 0 });
      return;
    }
    this.ctx.update({ queueIndex: prevIdx });
    await this.playTrack(this.ctx.state.queue[prevIdx]);
  }

  stop() {
    abortCrossfade(this.ctx);
    this.ctx.audio.pause();
    this.ctx.audio.src = '';
    this.stopProgressTimer();
    this.ctx.update({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      queueIndex: -1,
    });
  }

  // ─── Queue ─────────────────────────────────────────────────────

  async addToQueue(track: MusicTrack) {
    addToQueue(this.ctx, track);
    if (!this.ctx.state.currentTrack)
      await this.playTrack(track, this.ctx.state.queue);
  }

  playNext(track: MusicTrack) {
    playNextInQueue(this.ctx, track);
    invalidatePreBuffer(this.ctx);
    if (!this.ctx.state.currentTrack)
      this.playTrack(track, this.ctx.state.queue);
  }

  removeFromQueue(index: number) {
    removeFromQueue(this.ctx, index);
  }

  async loadQueue() {
    await loadQueue(this.ctx);
  }

  // ─── Shuffle / Repeat / Volume ─────────────────────────────────

  toggleShuffle() {
    const shuffle = !this.ctx.state.shuffle;
    if (shuffle) {
      this.ctx.shuffledOrder = generateShuffleOrder(
        this.ctx.state.queue.length,
        this.ctx.state.queueIndex,
      );
    }
    this.ctx.update({ shuffle });
  }

  cycleRepeat() {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.ctx.state.repeat);
    this.ctx.update({ repeat: modes[(idx + 1) % modes.length] });
  }

  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    if (!this.ctx.crossfadeActive) {
      this.ctx.audio.volume = vol;
      if (this.ctx.nextAudio) this.ctx.nextAudio.volume = vol;
    }
    // During crossfade, only update state — the crossfade loop reads ctx.state.volume each step
    this.ctx.update({ volume: vol });
  }

  // ─── Equalizer ─────────────────────────────────────────────────

  initEqualizer() {
    initEqualizer(this.ctx);
  }

  setEqBands(bands: EqualizerBand[]) {
    setEqBands(this.ctx, bands);
  }

  getEqBands(): EqualizerBand[] {
    return getEqBands(this.ctx);
  }

  // ─── Sleep Timer ───────────────────────────────────────────────

  setSleepTimer(minutes: number) {
    setSleepTimer(this.ctx, minutes, () => this.stop());
  }

  clearSleepTimer() {
    clearSleepTimer(this.ctx);
  }

  // ─── Settings ──────────────────────────────────────────────────

  setCrossfadeDuration(seconds: number) {
    const val = Math.max(0, Math.min(12, seconds));
    this.ctx.update({ crossfadeDuration: val });
    if (val > 0) invalidatePreBuffer(this.ctx);
    try {
      localStorage.setItem('nightwatch:crossfade', String(val));
    } catch {
      /* ignore */
    }
  }

  setGapless(enabled: boolean) {
    this.ctx.update({ gapless: enabled });
    try {
      localStorage.setItem('nightwatch:gapless', String(enabled));
    } catch {
      /* ignore */
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  destroy() {
    this.stop();
    clearSleepTimer(this.ctx);
    destroyEqualizer(this.ctx);
    this.ctx.listeners.clear();
  }
}
