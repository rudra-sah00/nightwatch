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

  describe('syncVideo', () => {
    it('should sync time when difference exceeds threshold', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.currentTime).toBe(10);
    });

    it('should not sync time when difference is below threshold', () => {
      mockVideo.currentTime = 10.3;
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10.5,
        isPlaying: false,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      // Should not change because difference (0.2) is below threshold (0.5)
      expect(mockVideo.currentTime).toBe(10.3);
    });

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

    it('should sync playback rate', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      const state: PartyStateUpdate = {
        currentTime: 10,
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
        currentTime: 10,
        isPlaying: false,
        playbackRate: 5, // Invalid - above max
        timestamp: Date.now(),
      };

      act(() => {
        result.current.syncVideo(state);
      });

      expect(mockVideo.playbackRate).toBe(1); // Should remain unchanged
    });

    it('should handle metadata not loaded - wait for loadedmetadata event', () => {
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
      // First call rejects, second call (muted) resolves
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
        // Wait for promises to settle
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should have tried to play muted
      expect(mockVideo.muted).toBe(true);
      // Play should have been called at least twice
      expect(mockVideo.play).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifySyncState', () => {
    it('should return true when video matches last applied state', () => {
      mockVideo.currentTime = 10;
      mockVideo.paused = false;
      mockVideo.playbackRate = 1.5;

      const { result } = renderHook(() => useVideoSync(videoRef));

      // First sync to set lastAppliedState
      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          playbackRate: 1.5,
          timestamp: Date.now(),
        });
      });

      expect(result.current.verifySyncState()).toBe(true);
    });

    it('should return false when play state does not match', () => {
      mockVideo.currentTime = 10;
      mockVideo.paused = true; // Mismatch - should be playing
      mockVideo.playbackRate = 1.5;

      const { result } = renderHook(() => useVideoSync(videoRef));

      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: true,
          playbackRate: 1.5,
          timestamp: Date.now(),
        });
      });

      expect(result.current.verifySyncState()).toBe(false);
    });

    it('should return true when no state has been applied yet', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));
      expect(result.current.verifySyncState()).toBe(true);
    });
  });

  describe('forceResync', () => {
    it('should re-apply last known state', () => {
      const { result } = renderHook(() => useVideoSync(videoRef));

      // First sync
      act(() => {
        result.current.syncVideo({
          currentTime: 10,
          isPlaying: false,
          timestamp: Date.now(),
        });
      });

      // Change video state manually
      mockVideo.currentTime = 50;

      // Force resync
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
          isPlaying: true,
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
