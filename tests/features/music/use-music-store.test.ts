import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectMusicEngine,
  useMusicStore,
} from '@/features/music/store/use-music-store';
import type { MusicTrack } from '@/features/music/types';

vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

const mockTrack: MusicTrack = {
  id: 't1',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  albumId: 'a1',
  duration: 200,
  image: 'http://img.jpg',
  language: 'en',
  year: 2024,
  hasLyrics: false,
};

describe('useMusicStore', () => {
  beforeEach(() => {
    act(() => {
      useMusicStore.getState().reset();
    });
  });

  it('has correct initial state', () => {
    const state = useMusicStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(1);
    expect(state.shuffle).toBe(false);
    expect(state.repeat).toBe('off');
    expect(state.progress).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.expanded).toBe(false);
    expect(state.isRemoteControlling).toBe(false);
  });

  it('setExpanded updates expanded state', () => {
    act(() => {
      useMusicStore.getState().setExpanded(true);
    });
    expect(useMusicStore.getState().expanded).toBe(true);
  });

  it('stop sets expanded to false', () => {
    act(() => {
      useMusicStore.setState({ expanded: true });
      useMusicStore.getState().stop();
    });
    expect(useMusicStore.getState().expanded).toBe(false);
  });

  it('_setEngineState merges partial state', () => {
    act(() => {
      useMusicStore.getState()._setEngineState({
        currentTrack: mockTrack,
        isPlaying: true,
        volume: 0.5,
      });
    });
    const state = useMusicStore.getState();
    expect(state.currentTrack).toEqual(mockTrack);
    expect(state.isPlaying).toBe(true);
    expect(state.volume).toBe(0.5);
  });

  it('_setProgress updates progress and duration', () => {
    act(() => {
      useMusicStore.getState()._setProgress(50, 200);
    });
    expect(useMusicStore.getState().progress).toBe(50);
    expect(useMusicStore.getState().duration).toBe(200);
  });

  it('setRemoteControlling updates remote state', () => {
    act(() => {
      useMusicStore
        .getState()
        .setRemoteControlling(true, mockTrack, true, 25, 180, [mockTrack]);
    });
    const state = useMusicStore.getState();
    expect(state.isRemoteControlling).toBe(true);
    expect(state.remoteTrack).toEqual(mockTrack);
    expect(state.remoteIsPlaying).toBe(true);
    expect(state.remoteProgress).toBe(25);
    expect(state.remoteDuration).toBe(180);
    expect(state.remoteQueue).toEqual([mockTrack]);
  });

  it('setRemoteControlling preserves unset fields', () => {
    act(() => {
      useMusicStore
        .getState()
        .setRemoteControlling(true, mockTrack, true, 25, 180, [mockTrack]);
    });
    act(() => {
      useMusicStore.getState().setRemoteControlling(false);
    });
    const state = useMusicStore.getState();
    expect(state.isRemoteControlling).toBe(false);
    // Other fields preserved since undefined
    expect(state.remoteTrack).toEqual(mockTrack);
  });

  it('reset restores initial state', () => {
    act(() => {
      useMusicStore.setState({
        currentTrack: mockTrack,
        isPlaying: true,
        volume: 0.5,
        expanded: true,
      });
      useMusicStore.getState().reset();
    });
    const state = useMusicStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(1);
    expect(state.expanded).toBe(false);
  });
});

describe('connectMusicEngine', () => {
  beforeEach(() => {
    act(() => {
      useMusicStore.getState().reset();
    });
  });

  it('wires engine actions to store and applies persisted preferences', () => {
    const mockEngine = {
      playTrack: vi.fn(),
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seek: vi.fn(),
      toggleShuffle: vi.fn(),
      cycleRepeat: vi.fn(),
      setVolume: vi.fn(),
      stop: vi.fn(),
      addToQueue: vi.fn(),
      playNext: vi.fn(),
      removeFromQueue: vi.fn(),
      getAudioElement: vi.fn(() => undefined),
      setCrossfadeDuration: vi.fn(),
      setGapless: vi.fn(),
      initEqualizer: vi.fn(),
      setEqBands: vi.fn(),
      getEqBands: vi.fn(() => []),
      setSleepTimer: vi.fn(),
      clearSleepTimer: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      loadQueue: vi.fn(),
    };

    act(() => {
      useMusicStore.setState({
        volume: 0.7,
        crossfadeDuration: 5,
        gapless: false,
      });
    });

    const unsub = connectMusicEngine(mockEngine as never);

    // Persisted settings applied
    expect(mockEngine.setVolume).toHaveBeenCalledWith(0.7);
    expect(mockEngine.setCrossfadeDuration).toHaveBeenCalledWith(5);
    expect(mockEngine.setGapless).toHaveBeenCalledWith(false);
    expect(mockEngine.subscribe).toHaveBeenCalled();
    expect(mockEngine.loadQueue).toHaveBeenCalled();

    // Actions wired
    act(() => {
      useMusicStore.getState().togglePlay();
    });
    expect(mockEngine.togglePlay).toHaveBeenCalled();

    act(() => {
      useMusicStore.getState().next();
    });
    expect(mockEngine.next).toHaveBeenCalled();

    act(() => {
      useMusicStore.getState().seek(50);
    });
    expect(mockEngine.seek).toHaveBeenCalledWith(50);

    unsub();
  });

  it('engine subscriber updates store on state changes', () => {
    let subscriberCallback: ((s: Record<string, unknown>) => void) | null =
      null;
    const mockEngine = {
      playTrack: vi.fn(),
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seek: vi.fn(),
      toggleShuffle: vi.fn(),
      cycleRepeat: vi.fn(),
      setVolume: vi.fn(),
      stop: vi.fn(),
      addToQueue: vi.fn(),
      playNext: vi.fn(),
      removeFromQueue: vi.fn(),
      getAudioElement: vi.fn(() => undefined),
      setCrossfadeDuration: vi.fn(),
      setGapless: vi.fn(),
      initEqualizer: vi.fn(),
      setEqBands: vi.fn(),
      getEqBands: vi.fn(() => []),
      setSleepTimer: vi.fn(),
      clearSleepTimer: vi.fn(),
      subscribe: vi.fn((fn: (s: Record<string, unknown>) => void) => {
        subscriberCallback = fn;
        return vi.fn();
      }),
      loadQueue: vi.fn(),
    };

    connectMusicEngine(mockEngine as never);

    // Simulate engine emitting state
    act(() => {
      subscriberCallback?.({
        currentTrack: mockTrack,
        queue: [mockTrack],
        isPlaying: true,
        shuffle: false,
        repeat: 'off',
        volume: 0.8,
        crossfadeDuration: 0,
        gapless: true,
        sleepTimerEnd: null,
        progress: 30,
        duration: 200,
      });
    });

    const state = useMusicStore.getState();
    expect(state.currentTrack).toEqual(mockTrack);
    expect(state.isPlaying).toBe(true);
    expect(state.progress).toBe(30);
    expect(state.duration).toBe(200);
  });
});
