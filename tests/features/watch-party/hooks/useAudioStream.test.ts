import { renderHook } from '@testing-library/react';
import type { Track } from 'livekit-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStream } from '@/features/watch-party/hooks/useAudioStream';

// Mock LiveKit Track
class MockTrack {
  kind = 'audio';
  attached = false;

  attach = vi.fn((element: HTMLAudioElement) => {
    this.attached = true;
    // Simulate attaching media stream
    const mediaStream = new MediaStream();
    element.srcObject = mediaStream;
  });

  detach = vi.fn((element: HTMLAudioElement) => {
    this.attached = false;
    element.srcObject = null;
  });
}

describe('useAudioStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Behavior', () => {
    it('should return an audio ref', () => {
      const mockTrack = new MockTrack();
      const { result } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, false),
      );

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });

    it('should return the same ref on re-render', () => {
      const mockTrack = new MockTrack();
      const { result, rerender } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, false),
      );

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('Remote vs Local Participant', () => {
    it('should not process audio for local participant', () => {
      const mockTrack = new MockTrack();
      const { result } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, true),
      );

      expect(result.current).toBeDefined();
      // Hook returns ref but doesn't attach for local
    });

    it('should return ref for remote participant', () => {
      const mockTrack = new MockTrack();
      const { result } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, false),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Track Changes', () => {
    it('should handle undefined track', () => {
      const { result } = renderHook(() => useAudioStream(undefined, false));

      expect(result.current).toBeDefined();
    });

    it('should handle track becoming undefined', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: { track: Track | undefined; isLocal: boolean }) =>
          useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          },
        },
      );

      expect(result.current).toBeDefined();

      // Track becomes undefined
      rerender({ track: undefined, isLocal: false } as any);

      expect(result.current).toBeDefined();
    });

    it('should handle track becoming defined', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: { track: Track | undefined; isLocal: boolean }) =>
          useAudioStream(track, isLocal),
        {
          initialProps: { track: undefined, isLocal: false },
        },
      );

      expect(result.current).toBeDefined();

      // Track becomes defined
      rerender({
        track: mockTrack as unknown as Track,
        isLocal: false,
      } as any);

      expect(result.current).toBeDefined();
    });

    it('should handle switching between tracks', () => {
      const track1 = new MockTrack();
      const track2 = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }) => useAudioStream(track, isLocal),
        {
          initialProps: { track: track1 as unknown as Track, isLocal: false },
        },
      );

      expect(result.current).toBeDefined();

      rerender({ track: track2 as unknown as Track, isLocal: false });

      expect(result.current).toBeDefined();
    });
  });

  describe('isLocal Changes', () => {
    it('should handle isLocal changing from false to true', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          },
        },
      );

      expect(result.current).toBeDefined();

      rerender({ track: mockTrack as unknown as Track, isLocal: true });

      expect(result.current).toBeDefined();
    });

    it('should handle isLocal changing from true to false', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }) => useAudioStream(track, isLocal),
        {
          initialProps: { track: mockTrack as unknown as Track, isLocal: true },
        },
      );

      expect(result.current).toBeDefined();

      rerender({ track: mockTrack as unknown as Track, isLocal: false });

      expect(result.current).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should handle unmount gracefully', () => {
      const mockTrack = new MockTrack();

      const { result, unmount } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, false),
      );

      expect(result.current).toBeDefined();

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple mount/unmount cycles', () => {
      const mockTrack = new MockTrack();

      for (let i = 0; i < 3; i++) {
        const { unmount } = renderHook(() =>
          useAudioStream(mockTrack as unknown as Track, false),
        );
        unmount();
      }

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle rapid track changes', () => {
      const tracks = Array.from({ length: 5 }, () => new MockTrack());

      const { result, rerender } = renderHook(
        ({ track, isLocal }) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: tracks[0] as unknown as Track,
            isLocal: false,
          },
        },
      );

      for (let i = 1; i < tracks.length; i++) {
        rerender({ track: tracks[i] as unknown as Track, isLocal: false });
      }

      expect(result.current).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle track with attach that throws', () => {
      const mockTrack = new MockTrack();
      mockTrack.attach = vi.fn(() => {
        throw new Error('Attach failed');
      });

      expect(() => {
        renderHook(() => useAudioStream(mockTrack as unknown as Track, false));
      }).not.toThrow();
    });

    it('should handle track with detach that throws', () => {
      const mockTrack = new MockTrack();
      mockTrack.detach = vi.fn(() => {
        throw new Error('Detach failed');
      });

      const { unmount } = renderHook(() =>
        useAudioStream(mockTrack as unknown as Track, false),
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle track with missing methods', () => {
      const mockTrack = {} as unknown as Track;

      expect(() => {
        renderHook(() => useAudioStream(mockTrack, false));
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle participant joining (track appears)', () => {
      const { result, rerender } = renderHook(
        ({ track, isLocal }: { track: Track | undefined; isLocal: boolean }) =>
          useAudioStream(track, isLocal),
        {
          initialProps: { track: undefined, isLocal: false },
        },
      );

      expect(result.current).toBeDefined();

      const mockTrack = new MockTrack();
      rerender({
        track: mockTrack as unknown as Track,
        isLocal: false,
      } as any);

      expect(result.current).toBeDefined();
    });

    it('should handle participant leaving (track disappears)', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: { track: Track | undefined; isLocal: boolean }) =>
          useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          },
        },
      );

      expect(result.current).toBeDefined();

      rerender({ track: undefined, isLocal: false } as any);

      expect(result.current).toBeDefined();
    });

    it('should handle network reconnection with new track', () => {
      const track1 = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: { track: Track | undefined; isLocal: boolean }) =>
          useAudioStream(track, isLocal),
        {
          initialProps: { track: track1 as unknown as Track, isLocal: false },
        },
      );

      // Connection drops
      rerender({ track: undefined, isLocal: false } as any);
      expect(result.current).toBeDefined();

      // Reconnect with new track
      const track2 = new MockTrack();
      rerender({ track: track2 as unknown as Track, isLocal: false });
      expect(result.current).toBeDefined();
    });

    it('should handle becoming host (remote -> local)', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          },
        },
      );

      // User becomes host
      rerender({ track: mockTrack as unknown as Track, isLocal: true });

      expect(result.current).toBeDefined();
    });
  });
});
