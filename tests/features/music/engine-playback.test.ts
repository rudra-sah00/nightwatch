vi.mock('@/lib/analytics', () => ({
  crashLog: vi.fn(),
  reportError: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/features/music/api', () => ({
  getStreamUrl: vi.fn(),
  getSongRecommendations: vi.fn(),
}));

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSongRecommendations, getStreamUrl } from '@/features/music/api';
import { autoContinue, playTrack } from '@/features/music/engine/playback';
import type { EngineContext } from '@/features/music/engine/types';
import type { MusicTrack } from '@/features/music/types';

const mockGetStreamUrl = vi.mocked(getStreamUrl);
const mockGetRecs = vi.mocked(getSongRecommendations);

const track: MusicTrack = {
  id: 't1',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  albumId: 'a1',
  duration: 200,
  image: '',
  language: 'en',
  year: 2024,
  hasLyrics: false,
};

function createCtx(overrides: Partial<EngineContext> = {}): EngineContext {
  const state = {
    currentTrack: null,
    queue: [track],
    queueIndex: 0,
    isPlaying: false,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off' as const,
    volume: 0.8,
    crossfadeDuration: 0,
    gapless: true,
    sleepTimerEnd: null,
  };
  return {
    audio: {
      src: '',
      volume: 0,
      paused: true,
      duration: 0,
      currentTime: 0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement,
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
    intentionalPause: false,
    update: vi.fn((partial) => Object.assign(state, partial)),
    setAudio: vi.fn(),
    setNextAudio: vi.fn(),
    incrementPlayId: vi.fn(() => ++state.queueIndex),
    ...overrides,
  };
}

describe('playTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetStreamUrl.mockResolvedValue('https://cdn/stream.mp3');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('happy path: sets track, fetches stream, plays, and updates state', async () => {
    const ctx = createCtx();
    const promise = playTrack(ctx, track);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockGetStreamUrl).toHaveBeenCalledWith('t1');
    expect(ctx.audio.src).toBe('https://cdn/stream.mp3');
    expect(ctx.audio.play).toHaveBeenCalled();
    expect(ctx.update).toHaveBeenCalledWith(
      expect.objectContaining({ isPlaying: true }),
    );
  });

  it('error case: retries once then marks not playing on failure', async () => {
    mockGetStreamUrl.mockRejectedValue(new Error('network'));
    const ctx = createCtx();
    const promise = playTrack(ctx, track);
    await vi.runAllTimersAsync();
    await promise;

    expect(ctx.update).toHaveBeenCalledWith(
      expect.objectContaining({ isPlaying: false }),
    );
  });

  it('edge case: aborts if playId changes mid-flight (skip during load)', async () => {
    const ctx = createCtx();
    mockGetStreamUrl.mockImplementation(async () => {
      // Simulate another track being queued (playId changes)
      ctx.playId = 999;
      return 'https://cdn/stream.mp3';
    });

    const promise = playTrack(ctx, track);
    await vi.runAllTimersAsync();
    await promise;

    // Should NOT call play since playId changed
    expect(ctx.audio.play).not.toHaveBeenCalled();
  });
});

describe('autoContinue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: fetches recommendations and plays next', async () => {
    const nextTrack = { ...track, id: 't2', title: 'Next' };
    mockGetRecs.mockResolvedValue([nextTrack]);
    const ctx = createCtx();
    ctx.state.currentTrack = track;

    const onStop = vi.fn();
    const onPlay = vi.fn().mockResolvedValue(undefined);

    await autoContinue(ctx, onStop, onPlay);

    expect(mockGetRecs).toHaveBeenCalledWith('t1');
    expect(ctx.update).toHaveBeenCalledWith(
      expect.objectContaining({ queue: [nextTrack], queueIndex: 0 }),
    );
    expect(onPlay).toHaveBeenCalledWith(nextTrack);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('error case: calls onStop when recommendations fail', async () => {
    mockGetRecs.mockRejectedValue(new Error('offline'));
    const ctx = createCtx();
    ctx.state.currentTrack = track;

    const onStop = vi.fn();
    const onPlay = vi.fn();

    await autoContinue(ctx, onStop, onPlay);

    expect(onStop).toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('edge case: calls onStop when no current track', async () => {
    const ctx = createCtx();
    ctx.state.currentTrack = null;

    const onStop = vi.fn();
    const onPlay = vi.fn();

    await autoContinue(ctx, onStop, onPlay);

    expect(onStop).toHaveBeenCalled();
    expect(mockGetRecs).not.toHaveBeenCalled();
  });

  it('edge case: calls onStop when recommendations return empty', async () => {
    mockGetRecs.mockResolvedValue([]);
    const ctx = createCtx();
    ctx.state.currentTrack = track;

    const onStop = vi.fn();
    const onPlay = vi.fn();

    await autoContinue(ctx, onStop, onPlay);

    expect(onStop).toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });
});
