import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePredictiveSync } from '@/features/watch-party/hooks/usePredictiveSync';

interface MockVideoElement {
  currentTime: number;
  playbackRate: number;
  paused: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

describe('usePredictiveSync', () => {
  let mockVideo: MockVideoElement;
  let videoElement: HTMLVideoElement;
  let videoRef: { current: HTMLVideoElement | null };

  beforeEach(() => {
    // Mock Video Element
    mockVideo = {
      currentTime: 0,
      playbackRate: 1,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    };
    videoElement = mockVideo as unknown as HTMLVideoElement;

    videoRef = { current: videoElement };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply initial state correctly', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    act(() => {
      // Simulate receiving a state update from server
      // Server says: Playing at 10s, Rate 1, Timestamp now
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: Date.now(),
        serverTime: Date.now(),
      });
    });

    // Should play and sync time
    expect(videoElement.play).toHaveBeenCalled();
    // Since we are calibrated and drift is > 2s (0 vs 10), it should hard seek
    expect(videoElement.currentTime).toBeCloseTo(10);
  });

  it('should handle soft drift correction (speed up)', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    // Video is at 10s, playing
    videoElement.currentTime = 10;
    mockVideo.paused = false;

    // Server says: 10.5s (0.5s ahead) - Soft drift
    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10.5,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Should adjust rate to +5% (1.05)
    expect(videoElement.playbackRate).toBeCloseTo(1.05);
    // Should NOT hard seek
    expect(videoElement.currentTime).toBe(10);
  });

  it('should handle soft drift correction (slow down)', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    // Video is at 10.5s, playing
    videoElement.currentTime = 10.5;
    mockVideo.paused = false;

    // Server says: 10.0s (0.5s behind) - Soft drift
    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10.0,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Should adjust rate to -5% (0.95)
    expect(videoElement.playbackRate).toBeCloseTo(0.95);
  });

  it('should hard seek for large drift', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    videoElement.currentTime = 10;
    mockVideo.paused = false;

    // Server says: 20s (10s ahead) - Large drift
    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 20,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Should hard seek
    expect(videoElement.currentTime).toBe(20);
    // Rate should be normal
    expect(videoElement.playbackRate).toBe(1);
  });

  it('should predict expected time based on server time passing', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    // Init state at T=0
    const startTime = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: startTime,
        serverTime: startTime,
      });
    });

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);

    // Expected time should be 10 + 5 = 15
    expect(result.current.getExpectedTime()).toBeCloseTo(15);
  });

  it('should account for clock offset', () => {
    // Client clock is 1000ms behind server (Offset = +1000)
    const { result } = renderHook(() =>
      usePredictiveSync(videoRef, 1000, true),
    );

    const now = Date.now();
    // Server says: Event happened at ServerTime = now + 1000;
    // So event happened "just now" in synchronized time

    act(() => {
      result.current.applyState({
        currentTime: 50,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now + 1000,
      });
    });

    // Advance local time by 1s (1000ms)
    vi.advanceTimersByTime(1000);

    // Local Now = T+1000
    // Server Now = Local Now + Offset = T+1000 + 1000 = T+2000
    // Elapsed since Event (ServerTime T+1000) = (T+2000) - (T+1000) = 1000ms = 1s
    // Expected Video Time = 50 + 1 * 1 = 51

    expect(result.current.getExpectedTime()).toBeCloseTo(51);
  });

  it('should fallback to simple sync when not calibrated', () => {
    const { result } = renderHook(
      () => usePredictiveSync(videoRef, 0, false), // Not calibrated
    );

    videoElement.currentTime = 0;
    mockVideo.paused = true;

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1.5,
        timestamp: now,
        serverTime: now,
      });
    });

    // Should hard sync since drift > 0.5
    expect(videoElement.currentTime).toBe(10);
    expect(videoElement.play).toHaveBeenCalled();
    expect(videoElement.playbackRate).toBe(1.5);
  });

  it('should pause video when not playing and calibrated', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    videoElement.currentTime = 10;
    mockVideo.paused = false;

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: false,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    expect(videoElement.pause).toHaveBeenCalled();
  });

  it('should not update playback rate when already at target', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    videoElement.currentTime = 10;
    videoElement.playbackRate = 1;
    mockVideo.paused = false;

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10.1, // drift < 0.3
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Should remain at 1
    expect(videoElement.playbackRate).toBe(1);
  });

  it('should run periodic drift check and hard seek if way off', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Set video way behind
    videoElement.currentTime = 5;
    mockVideo.paused = false;

    // Advance to trigger periodic check (2s interval)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Expected time = 10 + 2 = 12, actual = 5, drift = 7 > 2
    // Should hard seek
    expect(videoElement.currentTime).toBe(12);
  });

  it('should force play if paused locally but party is playing', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Video is paused locally
    videoElement.currentTime = 10;
    mockVideo.paused = true;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should force play
    expect(videoElement.play).toHaveBeenCalled();
  });

  it('should restore rate when drift resolved', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    // Video is perfectly in sync but rate was adjusted
    videoElement.currentTime = 12; // 10 + 2s
    videoElement.playbackRate = 1.05; // Was adjusting
    mockVideo.paused = false;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Drift is ~0, should restore to 1
    expect(videoElement.playbackRate).toBe(1);
  });

  it('should return 0 from getExpectedTime when no state', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    expect(result.current.getExpectedTime()).toBe(0);
  });

  it('should return videoTime when paused', () => {
    const { result } = renderHook(() => usePredictiveSync(videoRef, 0, true));

    const now = Date.now();
    act(() => {
      result.current.applyState({
        currentTime: 50,
        isPlaying: false,
        playbackRate: 1,
        timestamp: now,
        serverTime: now,
      });
    });

    vi.advanceTimersByTime(5000);

    // Even after time passes, expected should stay at 50 since paused
    expect(result.current.getExpectedTime()).toBe(50);
  });

  it('should handle null videoRef gracefully', () => {
    const nullRef = { current: null };
    const { result } = renderHook(() => usePredictiveSync(nullRef, 0, true));

    // Should not throw
    act(() => {
      result.current.applyState({
        currentTime: 10,
        isPlaying: true,
        playbackRate: 1,
        timestamp: Date.now(),
        serverTime: Date.now(),
      });
    });
  });
});
