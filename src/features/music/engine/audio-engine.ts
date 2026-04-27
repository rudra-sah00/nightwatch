import type { MusicTrack } from '../api';
import { getStreamUrl } from '../api';

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
}

type Listener = (state: AudioEngineState) => void;

export class AudioEngine {
  private audio: HTMLAudioElement;
  private state: AudioEngineState;
  private listeners = new Set<Listener>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private shuffledOrder: number[] = [];

  constructor() {
    this.audio = new Audio();
    this.state = {
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      progress: 0,
      duration: 0,
      shuffle: false,
      repeat: 'off',
    };

    this.audio.onended = () => this.handleEnded();
    this.audio.onloadedmetadata = () => {
      this.update({ duration: this.audio.duration });
    };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getState() {
    return this.state;
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
      }
    }, 250);
  }

  private stopProgressTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
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
    this.next();
  }

  async playTrack(track: MusicTrack, queue?: MusicTrack[]) {
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
      const url = await getStreamUrl(track.id);
      this.audio.src = url;
      await this.audio.play();
      this.update({ isPlaying: true });
      this.startProgressTimer();
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
          this.stop();
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
          this.stop();
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

  destroy() {
    this.stop();
    this.listeners.clear();
  }
}
