import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVideoSync } from '@/features/watch-party/hooks/useVideoSync';
import type { PartyStateUpdate } from '@/features/watch-party/types';

// Create a mutable mock video type
interface MockVideo {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  duration: number;
  muted: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('useVideoSync', () => {
  let mockVideo: MockVideo;
  let videoRef: { current: HTMLVideoElement | null };

  beforeEach(() => {
    vi.useFakeTimers();
    mockVideo = {
      currentTime: 0,
      paused: true,
      playbackRate: 1,
      duration: 100,
      muted: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    videoRef = { current: mockVideo as unknown as HTMLVideoElement };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('syncVideo - drift correction', () => {
    it('should hard seek when drift exceeds hard threshold (2.0s)', () => {
      mockVideo.currentTime = 0;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10, // 10s drift - well above 2.0s threshold
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.currentTime).toBe(10);
    });

    it('should not hard seek when drift is within soft threshold (0.3s)', () => {
      mockVideo.currentTime = 10.2;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10.4, // 0.2s drift - below 0.3s threshold
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Should not seek - drift is acceptable (below 0.3s)
      expect(mockVideo.currentTime).toBe(10.2);
    });

    it('should use gradual rate correction for medium drift (0.3s - 2.0s) when playing', () => {
      mockVideo.currentTime = 0;
      mockVideo.paused = false;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 1.0, // 1.0s drift - in gradual correction zone
        isPlaying: true,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Should NOT hard seek (drift < 2.0s)
      expect(mockVideo.currentTime).toBe(0);
      // Should apply catch-up rate (1.03x)
      expect(mockVideo.playbackRate).toBe(1.03);
    });

    it('should slow down when guest is ahead of host', () => {
      mockVideo.currentTime = 1.5;
      mockVideo.paused = false;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 0.5, // Guest is 1.0s ahead of host
        isPlaying: true,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Should apply slow-down rate (0.97x)
      expect(mockVideo.playbackRate).toBe(0.97);
    });

    it('should return to host rate after correction timeout', () => {
      mockVideo.currentTime = 0;
      mockVideo.paused = false;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 0.5, // 0.5s drift - gradual correction zone
        isPlaying: true,
        playbackRate: 1.5, // Host is playing at 1.5x
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Initially should be catch-up rate (1.5 * 1.03)
      expect(mockVideo.playbackRate).toBeCloseTo(1.545, 2);

      // After correction timeout, should return to host rate
      act(() => {
        vi.advanceTimersByTime(6000); // Advance past correction timeout
      });

      expect(mockVideo.playbackRate).toBe(1.5);
    });

    it('should hard seek when paused with significant drift', () => {
      mockVideo.currentTime = 10;
      mockVideo.paused = true;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 15, // 5s drift while paused
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Should seek immediately when paused (no gradual correction for paused state)
      expect(mockVideo.currentTime).toBe(15);
    });
  });

  describe('syncVideo - play/pause state', () => {
    it('should play video when isPlaying is true and video is paused', () => {
      mockVideo.paused = true;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
        isPlaying: true,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('should pause video when isPlaying is false and video is playing', () => {
      mockVideo.paused = false;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should sync playback rate from host', () => {
      mockVideo.paused = true;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.5,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.playbackRate).toBe(1.5);
    });

    it('should not set invalid playback rate', () => {
      mockVideo.playbackRate = 1;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 5, // Invalid - above max (2.0)
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.playbackRate).toBe(1); // Should remain unchanged
    });
  });

  describe('syncVideo - metadata not loaded', () => {
    it('should wait for loadedmetadata event', () => {
      mockVideo.duration = Number.NaN;
      let loadedMetadataCallback: () => void;
      mockVideo.addEventListener = vi.fn((event, callback) => {
        if (event === 'loadedmetadata') {
          loadedMetadataCallback = callback as () => void;
        }
      });

      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
        isPlaying: true,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.addEventListener).toHaveBeenCalledWith(
        'loadedmetadata',
        expect.any(Function),
        { once: true },
      );

      // Simulate metadata loaded
      act(() => {
        loadedMetadataCallback!();
      });

      expect(mockVideo.currentTime).toBe(10);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('should retry play on autoplay restriction', async () => {
      const playError = new Error('Autoplay blocked');
      playError.name = 'NotAllowedError';
      mockVideo.play = vi
        .fn()
        .mockRejectedValueOnce(playError)
        .mockResolvedValue(undefined);
      mockVideo.paused = true;

      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
        isPlaying: true,
        timestamp: Date.now(),
      };

      await act(async () => {
        result.current.syncVideo(state);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should have tried to play muted
      expect(mockVideo.muted).toBe(true);
      expect(mockVideo.play).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifySyncState', () => {
    it('should return true when video matches last applied state', () => {
      mockVideo.currentTime = 10;
      mockVideo.paused = false;

      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          timestamp: Date.now(),
        });
      });

      expect(result.current.verifySyncState()).toBe(true);
    });

    it('should return false when play state does not match', () => {
      mockVideo.currentTime = 10;
      mockVideo.paused = true; // Mismatch - should be playing

      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          timestamp: Date.now(),
        });
      });

      expect(result.current.verifySyncState()).toBe(false);
    });

    it('should return true for drift within hard threshold', () => {
      mockVideo.currentTime = 11.5; // 1.5s drift from applied state
      mockVideo.paused = false;

      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          timestamp: Date.now(),
        });
      });

      // 1.5s drift is within 2.0s hard threshold, so should be considered synced
      expect(result.current.verifySyncState()).toBe(true);
    });

    it('should return true when no state has been applied yet', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));
      expect(result.current.verifySyncState()).toBe(true);
    });
  });

  describe('forceResync', () => {
    it('should re-apply last known state', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: false,
          timestamp: Date.now(),
        });
      });

      // Change video state manually
      mockVideo.currentTime = 50;

      act(() => {
        result.current.forceResync();
      });

      expect(mockVideo.currentTime).toBe(10);
    });

    it('should do nothing if no state was previously applied', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.forceResync();
      });

      expect(mockVideo.currentTime).toBe(0); // Unchanged
    });
  });

  describe('cleanup', () => {
    it('should clear pending sync when new sync arrives', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: false,
          timestamp: Date.now(),
        });
      });

      // Immediately send another sync before retry timer fires
      act(() => {
        result.current.syncVideo({
          currentTime: 20,
          isPlaying: false,
          timestamp: Date.now(),
        });
      });

      expect(mockVideo.currentTime).toBe(20);
    });
  });

  describe('with null video ref', () => {
    it('should handle null video ref gracefully', () => {
      const nullRef = { current: null };
      const { result } = renderHook(() => useVideoSync(nullRef));

      // Should not throw
      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          timestamp: Date.now(),
        });
      });

      expect(result.current.verifySyncState()).toBe(true);
    });
  });
});
