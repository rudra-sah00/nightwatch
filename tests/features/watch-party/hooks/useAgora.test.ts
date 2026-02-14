import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgora } from '@/features/watch-party/hooks/useAgora';

const { mockClient, mockAudioTrack, mockVideoTrack, mockCamera } = vi.hoisted(
  () => ({
    mockClient: {
      on: vi.fn(),
      off: vi.fn(),
      join: vi.fn().mockResolvedValue(1),
      leave: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      unpublish: vi.fn().mockResolvedValue(undefined),
      enableAudioVolumeIndicator: vi.fn(),
      remoteUsers: [],
      connectionState: 'DISCONNECTED',
    },
    mockAudioTrack: {
      close: vi.fn(),
      stop: vi.fn(),
      play: vi.fn(),
      setDevice: vi.fn().mockResolvedValue(undefined),
    },
    mockVideoTrack: {
      close: vi.fn(),
      stop: vi.fn(),
      play: vi.fn(),
      setDevice: vi.fn().mockResolvedValue(undefined),
    },
    mockCamera: {
      kind: 'videoinput',
      deviceId: 'test-camera',
      label: 'Test Camera',
    },
  }),
);

vi.mock('agora-rtc-sdk-ng', () => {
  return {
    default: {
      createClient: vi.fn().mockReturnValue(mockClient),
      onAutoplayFailed: vi.fn(),
      setLogLevel: vi.fn(),
      getDevices: vi.fn().mockResolvedValue([mockCamera]),
      createMicrophoneAudioTrack: vi.fn().mockResolvedValue(mockAudioTrack),
      createCameraVideoTrack: vi.fn().mockResolvedValue(mockVideoTrack),
    },
    createClient: vi.fn().mockReturnValue(mockClient),
    createMicrophoneAudioTrack: vi.fn().mockResolvedValue(mockAudioTrack),
    createCameraVideoTrack: vi.fn().mockResolvedValue(mockVideoTrack),
  };
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  configurable: true,
});

describe('useAgora', () => {
  const defaultOptions = {
    token: 'test-token',
    appId: 'test-app-id',
    channel: 'test-channel',
    uid: 12345,
    members: [
      {
        id: 'user-1',
        name: 'Host Name',
        profilePhoto: 'https://host.com/photo.jpg',
      },
      { id: 'user-2', name: 'Guest Name' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with all participants mapped from members immediately', async () => {
    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    await waitFor(() => {
      expect(result.current.participants).toHaveLength(2);
    });

    const localPart = result.current.participants.find((p) => p.isLocal);
    expect(localPart?.name).toBe('You');
  });

  it('should handle participants without profile photos correctly', async () => {
    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-2',
        uid: 3550199,
      }),
    );

    await waitFor(() => {
      expect(result.current.participants).toHaveLength(2);
    });

    const localPart = result.current.participants.find((p) => p.isLocal);
    expect(localPart?.identity).toBe('user-2');
  });

  it('should clean up tracks and listeners on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    // Wait for join
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    mockClient.connectionState = 'CONNECTED';

    // Toggle audio and video to create tracks
    await act(async () => {
      await result.current.toggleAudio();
    });
    await act(async () => {
      await result.current.toggleVideo();
    });

    await waitFor(() => {
      expect(mockClient.publish).toHaveBeenCalled();
    });

    // Unmount
    unmount();

    // Verify cleanup
    expect(mockClient.off).toHaveBeenCalledWith(
      'user-published',
      expect.any(Function),
    );

    // Should unpublish tracks if connected
    expect(mockClient.unpublish).toHaveBeenCalledWith(mockAudioTrack);
    expect(mockClient.unpublish).toHaveBeenCalledWith(mockVideoTrack);

    // Should close tracks
    expect(mockAudioTrack.close).toHaveBeenCalled();
    expect(mockVideoTrack.close).toHaveBeenCalled();

    // Should leave channel
    expect(mockClient.leave).toHaveBeenCalled();
  });
});
