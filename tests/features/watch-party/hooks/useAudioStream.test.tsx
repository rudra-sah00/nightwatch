import { render, renderHook, screen } from '@testing-library/react';
import type { Track } from 'livekit-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStream } from '@/features/watch-party/hooks/useAudioStream';

// Type for hook props to ensure consistent typing across test cases
type HookProps = { track: Track | undefined; isLocal: boolean };

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

// Component wrapper to properly test the hook with a real audio element
function AudioComponent({ track, isLocal }: HookProps) {
  const audioRef = useAudioStream(track, isLocal);
  return (
    <audio data-testid="audio-element" ref={audioRef}>
      <track kind="captions" />
    </audio>
  );
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
        ({ track, isLocal }: HookProps) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          } as HookProps,
        },
      );

      expect(result.current).toBeDefined();

      // Track becomes undefined
      rerender({
        track: undefined,
        isLocal: false,
      } as HookProps);

      expect(result.current).toBeDefined();
    });

    it('should handle track becoming defined', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: HookProps) => useAudioStream(track, isLocal),
        {
          initialProps: { track: undefined, isLocal: false } as HookProps,
        },
      );

      expect(result.current).toBeDefined();

      // Track becomes defined
      rerender({
        track: mockTrack as unknown as Track,
        isLocal: false,
      } as HookProps);

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
        ({ track, isLocal }: HookProps) => useAudioStream(track, isLocal),
        {
          initialProps: { track: undefined, isLocal: false } as HookProps,
        },
      );

      expect(result.current).toBeDefined();

      const mockTrack = new MockTrack();
      rerender({
        track: mockTrack as unknown as Track,
        isLocal: false,
      } as HookProps);

      expect(result.current).toBeDefined();
    });

    it('should handle participant leaving (track disappears)', () => {
      const mockTrack = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: HookProps) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: mockTrack as unknown as Track,
            isLocal: false,
          } as HookProps,
        },
      );

      expect(result.current).toBeDefined();

      rerender({
        track: undefined,
        isLocal: false,
      } as HookProps);

      expect(result.current).toBeDefined();
    });

    it('should handle network reconnection with new track', () => {
      const track1 = new MockTrack();

      const { result, rerender } = renderHook(
        ({ track, isLocal }: HookProps) => useAudioStream(track, isLocal),
        {
          initialProps: {
            track: track1 as unknown as Track,
            isLocal: false,
          } as HookProps,
        },
      );

      // Connection drops
      rerender({
        track: undefined,
        isLocal: false,
      } as HookProps);
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

  describe('Audio Element Attachment', () => {
    it('should attach track to audio element for remote participant', () => {
      const mockTrack = new MockTrack();
      render(
        <AudioComponent
          track={mockTrack as unknown as Track}
          isLocal={false}
        />,
      );

      const audioElement = screen.getByTestId('audio-element');
      expect(mockTrack.attach).toHaveBeenCalledWith(audioElement);
      expect(mockTrack.attached).toBe(true);
    });

    it('should NOT attach track for local participant', () => {
      const mockTrack = new MockTrack();
      render(
        <AudioComponent track={mockTrack as unknown as Track} isLocal={true} />,
      );

      expect(mockTrack.attach).not.toHaveBeenCalled();
      expect(mockTrack.attached).toBe(false);
    });

    it('should NOT attach when track is undefined', () => {
      const { container } = render(
        <AudioComponent track={undefined} isLocal={false} />,
      );

      // Audio element exists but no track attached
      const audioElement = container.querySelector('audio');
      expect(audioElement).toBeTruthy();
    });

    it('should configure audio element for remote playback', () => {
      const mockTrack = new MockTrack();
      render(
        <AudioComponent
          track={mockTrack as unknown as Track}
          isLocal={false}
        />,
      );

      const audioElement = screen.getByTestId(
        'audio-element',
      ) as HTMLAudioElement;
      expect(audioElement.muted).toBe(false);
      expect(audioElement.volume).toBe(1);
    });

    it('should attempt to play audio', () => {
      const mockTrack = new MockTrack();
      const playSpy = vi.fn().mockResolvedValue(undefined);
      HTMLAudioElement.prototype.play = playSpy;

      render(
        <AudioComponent
          track={mockTrack as unknown as Track}
          isLocal={false}
        />,
      );

      expect(playSpy).toHaveBeenCalled();
    });

    it('should handle play() rejection gracefully', () => {
      const mockTrack = new MockTrack();
      const playSpy = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));
      HTMLAudioElement.prototype.play = playSpy;

      // Should not throw
      expect(() => {
        render(
          <AudioComponent
            track={mockTrack as unknown as Track}
            isLocal={false}
          />,
        );
      }).not.toThrow();
    });

    it('should detach track on unmount', () => {
      const mockTrack = new MockTrack();
      const { unmount } = render(
        <AudioComponent
          track={mockTrack as unknown as Track}
          isLocal={false}
        />,
      );

      const audioElement = screen.getByTestId('audio-element');
      expect(mockTrack.attach).toHaveBeenCalledWith(audioElement);

      unmount();

      expect(mockTrack.detach).toHaveBeenCalledWith(audioElement);
    });

    it('should detach old track and attach new track when track changes', () => {
      const track1 = new MockTrack();
      const track2 = new MockTrack();

      const { rerender } = render(
        <AudioComponent track={track1 as unknown as Track} isLocal={false} />,
      );

      const audioElement = screen.getByTestId('audio-element');
      expect(track1.attach).toHaveBeenCalledWith(audioElement);

      // Change to new track
      rerender(
        <AudioComponent track={track2 as unknown as Track} isLocal={false} />,
      );

      expect(track1.detach).toHaveBeenCalledWith(audioElement);
      expect(track2.attach).toHaveBeenCalledWith(audioElement);
    });

    it('should detach track when isLocal changes from false to true', () => {
      const mockTrack = new MockTrack();

      const { rerender } = render(
        <AudioComponent
          track={mockTrack as unknown as Track}
          isLocal={false}
        />,
      );

      const audioElement = screen.getByTestId('audio-element');
      expect(mockTrack.attach).toHaveBeenCalledWith(audioElement);

      // Become local participant
      rerender(
        <AudioComponent track={mockTrack as unknown as Track} isLocal={true} />,
      );

      expect(mockTrack.detach).toHaveBeenCalledWith(audioElement);
    });
  });
});
