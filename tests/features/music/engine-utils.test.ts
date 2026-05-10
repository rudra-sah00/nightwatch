import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidatePreBuffer } from '@/features/music/engine/gapless';
import {
  checkSleepTimerExpired,
  clearSleepTimer,
  setSleepTimer,
} from '@/features/music/engine/sleep-timer';
import type { EngineContext } from '@/features/music/engine/types';

function createMockCtx(overrides: Partial<EngineContext> = {}): EngineContext {
  const state = {
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off' as const,
    volume: 1,
    crossfadeDuration: 0,
    gapless: true,
    sleepTimerEnd: null,
  };
  return {
    audio: {} as HTMLAudioElement,
    nextAudio: null,
    state,
    playId: 1,
    crossfadeActive: false,
    crossfadeAborted: false,
    shuffledOrder: [],
    audioContext: null,
    sourceNode: null,
    sourceNodes: new WeakMap(),
    eqFilters: [],
    eqBands: [],
    sleepTimerHandle: null,
    progressInterval: null,
    listeners: new Set(),
    update: (partial) => {
      Object.assign(state, partial);
    },
    setAudio: vi.fn(),
    setNextAudio: vi.fn(),
    incrementPlayId: vi.fn(() => 2),
    ...overrides,
  };
}

describe('sleep-timer module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets sleepTimerEnd in state', () => {
    const ctx = createMockCtx();
    const onFire = vi.fn();
    setSleepTimer(ctx, 30, onFire);
    expect(ctx.state.sleepTimerEnd).toBeGreaterThan(Date.now() - 1000);
  });

  it('fires callback after duration', () => {
    const ctx = createMockCtx();
    const onFire = vi.fn();
    setSleepTimer(ctx, 1, onFire); // 1 minute
    vi.advanceTimersByTime(60_000);
    expect(onFire).toHaveBeenCalledOnce();
    expect(ctx.state.sleepTimerEnd).toBeNull();
  });

  it('clearSleepTimer cancels pending timer', () => {
    const ctx = createMockCtx();
    const onFire = vi.fn();
    setSleepTimer(ctx, 5, onFire);
    clearSleepTimer(ctx);
    vi.advanceTimersByTime(300_000);
    expect(onFire).not.toHaveBeenCalled();
    expect(ctx.state.sleepTimerEnd).toBeNull();
  });

  it('does nothing for 0 or negative minutes', () => {
    const ctx = createMockCtx();
    setSleepTimer(ctx, 0, vi.fn());
    expect(ctx.sleepTimerHandle).toBeNull();
    setSleepTimer(ctx, -5, vi.fn());
    expect(ctx.sleepTimerHandle).toBeNull();
  });

  it('checkSleepTimerExpired returns true when past end time', () => {
    const ctx = createMockCtx();
    ctx.state.sleepTimerEnd = Date.now() - 1000;
    expect(checkSleepTimerExpired(ctx)).toBe(true);
  });

  it('checkSleepTimerExpired returns false when not expired', () => {
    const ctx = createMockCtx();
    ctx.state.sleepTimerEnd = Date.now() + 60_000;
    expect(checkSleepTimerExpired(ctx)).toBe(false);
  });

  it('checkSleepTimerExpired returns false when no timer set', () => {
    const ctx = createMockCtx();
    expect(checkSleepTimerExpired(ctx)).toBe(false);
  });
});

describe('gapless module', () => {
  describe('invalidatePreBuffer', () => {
    it('clears nextAudio when not crossfading', () => {
      const mockAudio = { pause: vi.fn(), src: 'http://test.mp3' };
      const setNextAudio = vi.fn();
      const ctx = createMockCtx({
        nextAudio: mockAudio as unknown as HTMLAudioElement,
        crossfadeActive: false,
        setNextAudio,
      });
      invalidatePreBuffer(ctx);
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.src).toBe('');
      expect(setNextAudio).toHaveBeenCalledWith(null);
    });

    it('does not clear nextAudio during crossfade', () => {
      const mockAudio = { pause: vi.fn(), src: 'http://test.mp3' };
      const setNextAudio = vi.fn();
      const ctx = createMockCtx({
        nextAudio: mockAudio as unknown as HTMLAudioElement,
        crossfadeActive: true,
        setNextAudio,
      });
      invalidatePreBuffer(ctx);
      expect(mockAudio.pause).not.toHaveBeenCalled();
      expect(setNextAudio).not.toHaveBeenCalled();
    });

    it('does nothing when nextAudio is null', () => {
      const setNextAudio = vi.fn();
      const ctx = createMockCtx({ nextAudio: null, setNextAudio });
      invalidatePreBuffer(ctx);
      expect(setNextAudio).not.toHaveBeenCalled();
    });
  });
});
