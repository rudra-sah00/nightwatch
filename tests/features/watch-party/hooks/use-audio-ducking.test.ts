import { act, renderHook, waitFor } from '@testing-library/react';
import type { Participant, Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioDucking } from '@/features/watch-party/hooks/useAudioDucking';

describe('useAudioDucking', () => {
  let mockVideoElement: HTMLVideoElement;
  let mockVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  let mockRoom: Room;
  let mockLocalParticipant: Participant;
  let mockRemoteParticipant: Participant;

  beforeEach(() => {
    // Mock video element
    mockVideoElement = {
      volume: 1,
    } as HTMLVideoElement;

    mockVideoRef = {
      current: mockVideoElement,
    };

    // Mock participants
    mockLocalParticipant = {
      identity: 'local-user',
      isSpeaking: false,
    } as Participant;

    mockRemoteParticipant = {
      identity: 'remote-user',
      isSpeaking: false,
    } as Participant;

    // Mock room
    mockRoom = {
      localParticipant: mockLocalParticipant,
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Room;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should start with normal volume when no one is speaking', () => {
      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      expect(result.current.isSomeoneSpeaking).toBe(false);
    });

    it('should register room event listeners', () => {
      renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      expect(mockRoom.on).toHaveBeenCalledWith(
        RoomEvent.ActiveSpeakersChanged,
        expect.any(Function),
      );
    });

    it('should handle null room', () => {
      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: null,
          participants: [],
          userVolume: 1,
        }),
      );

      expect(result.current.isSomeoneSpeaking).toBe(false);
    });
  });

  describe('Speaking detection', () => {
    it('should detect when remote participant is speaking', async () => {
      mockRemoteParticipant.isSpeaking = true;

      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      await waitFor(() => {
        expect(result.current.isSomeoneSpeaking).toBe(true);
      });
    });

    it('should ignore local participant speaking', async () => {
      mockLocalParticipant.isSpeaking = true;

      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      await waitFor(() => {
        expect(result.current.isSomeoneSpeaking).toBe(false);
      });
    });

    it('should detect when multiple remote participants are speaking', async () => {
      const mockRemoteParticipant2 = {
        identity: 'remote-user-2',
        isSpeaking: true,
      } as Participant;

      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [
            mockLocalParticipant,
            mockRemoteParticipant,
            mockRemoteParticipant2,
          ],
          userVolume: 1,
        }),
      );

      await waitFor(() => {
        expect(result.current.isSomeoneSpeaking).toBe(true);
      });
    });

    it('should update when participants change', async () => {
      const { result, rerender } = renderHook(
        ({ participants }) =>
          useAudioDucking({
            videoRef: mockVideoRef,
            room: mockRoom,
            participants,
            userVolume: 1,
          }),
        {
          initialProps: {
            participants: [mockLocalParticipant],
          },
        },
      );

      expect(result.current.isSomeoneSpeaking).toBe(false);

      // Add speaking remote participant
      mockRemoteParticipant.isSpeaking = true;
      rerender({
        participants: [mockLocalParticipant, mockRemoteParticipant],
      });

      await waitFor(() => {
        expect(result.current.isSomeoneSpeaking).toBe(true);
      });
    });
  });

  describe('Volume ducking', () => {
    it('should duck volume when someone starts speaking', async () => {
      mockRemoteParticipant.isSpeaking = false;

      const { rerender } = renderHook(
        ({ participants }) =>
          useAudioDucking({
            videoRef: mockVideoRef,
            room: mockRoom,
            participants,
            transitionMs: 50, // Faster transition for testing
            userVolume: 1,
          }),
        {
          initialProps: {
            participants: [mockLocalParticipant, mockRemoteParticipant],
          },
        },
      );

      expect(mockVideoElement.volume).toBe(1);

      // Someone starts speaking
      mockRemoteParticipant.isSpeaking = true;
      rerender({
        participants: [mockLocalParticipant, mockRemoteParticipant],
      });

      // Wait for animation to complete
      await waitFor(
        () => {
          expect(mockVideoElement.volume).toBeLessThan(0.9);
        },
        { timeout: 1000 },
      );
    });

    it('should restore volume when everyone stops speaking', async () => {
      mockRemoteParticipant.isSpeaking = true;

      const { rerender } = renderHook(
        ({ participants }) =>
          useAudioDucking({
            videoRef: mockVideoRef,
            room: mockRoom,
            participants,
            transitionMs: 50,
            userVolume: 1,
          }),
        {
          initialProps: {
            participants: [mockLocalParticipant, mockRemoteParticipant],
          },
        },
      );

      // Wait for initial duck
      await waitFor(
        () => {
          expect(mockVideoElement.volume).toBeLessThan(0.9);
        },
        { timeout: 1000 },
      );

      // Someone stops speaking
      mockRemoteParticipant.isSpeaking = false;
      rerender({
        participants: [mockLocalParticipant, mockRemoteParticipant],
      });

      // Wait for volume to restore
      await waitFor(
        () => {
          expect(mockVideoElement.volume).toBeGreaterThan(0.5);
        },
        { timeout: 1000 },
      );
    });

    it('should use custom volume values', async () => {
      mockRemoteParticipant.isSpeaking = true;

      renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          transitionMs: 50,
          userVolume: 1,
        }),
      );

      // Should duck to custom value
      await waitFor(
        () => {
          expect(mockVideoElement.volume).toBeLessThan(0.8);
        },
        { timeout: 1000 },
      );
    });
  });

  describe('Enable/disable functionality', () => {
    it('should not duck when disabled', () => {
      mockRemoteParticipant.isSpeaking = true;

      renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          enabled: false,
          userVolume: 1,
        }),
      );

      // Volume should remain at 1
      expect(mockVideoElement.volume).toBe(1);
    });

    it('should restore normal volume when setDuckingEnabled(false) is called', () => {
      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      mockVideoElement.volume = 0.3;

      act(() => {
        result.current.setDuckingEnabled(false);
      });

      expect(mockVideoElement.volume).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      unmount();

      expect(mockRoom.off).toHaveBeenCalledWith(
        RoomEvent.ActiveSpeakersChanged,
        expect.any(Function),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle null video ref', () => {
      const nullVideoRef = { current: null };
      mockRemoteParticipant.isSpeaking = true;

      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: nullVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          userVolume: 1,
        }),
      );

      // Should not throw error
      expect(result.current).toBeDefined();
    });

    it('should handle empty participants array', () => {
      const { result } = renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [],
          userVolume: 1,
        }),
      );

      expect(result.current.isSomeoneSpeaking).toBe(false);
    });

    it('should handle volume boundaries (0 and 1)', async () => {
      mockRemoteParticipant.isSpeaking = true;

      renderHook(() =>
        useAudioDucking({
          videoRef: mockVideoRef,
          room: mockRoom,
          participants: [mockLocalParticipant, mockRemoteParticipant],
          transitionMs: 50,
          userVolume: 1,
        }),
      );

      await waitFor(
        () => {
          // Volume should be clamped between 0 and 1
          expect(mockVideoElement.volume).toBeGreaterThanOrEqual(0);
          expect(mockVideoElement.volume).toBeLessThanOrEqual(1);
        },
        { timeout: 1000 },
      );
    });
  });
});
