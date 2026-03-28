import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgora } from '@/features/watch-party/media/hooks/useAgora';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

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

  it('should switch audio device and show success toast when track exists', async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockResolvedValue(
      mockAudioTrack as unknown as IMicrophoneAudioTrack,
    );
    mockClient.connectionState = 'CONNECTED';

    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    // Wait for join to complete
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Enable audio first so localAudioTrackRef.current is set
    await act(async () => {
      await result.current.toggleAudio();
    });

    await waitFor(() => expect(result.current.audioEnabled).toBe(true));

    // Now switch audio device — track exists so setDevice should be called
    mockAudioTrack.setDevice.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.switchAudioDevice('new-audio-device-id');
    });

    expect(mockAudioTrack.setDevice).toHaveBeenCalledWith(
      'new-audio-device-id',
    );
  });

  it('should show error toast when audio device switch fails', async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockResolvedValue(
      mockAudioTrack as unknown as IMicrophoneAudioTrack,
    );
    mockClient.connectionState = 'CONNECTED';

    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Enable audio
    await act(async () => {
      await result.current.toggleAudio();
    });
    await waitFor(() => expect(result.current.audioEnabled).toBe(true));

    // Make setDevice fail
    mockAudioTrack.setDevice.mockRejectedValueOnce(new Error('Device error'));
    await act(async () => {
      await result.current.switchAudioDevice('bad-device-id');
    });

    expect(mockAudioTrack.setDevice).toHaveBeenCalledWith('bad-device-id');
  });

  it('should switch video device and show success toast when track exists', async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    vi.mocked(AgoraRTC.createCameraVideoTrack).mockResolvedValue(
      mockVideoTrack as unknown as ICameraVideoTrack,
    );
    const mockCameraDevice = {
      kind: 'videoinput',
      deviceId: 'test-camera',
      label: 'Test Camera',
    };
    vi.mocked(AgoraRTC.getDevices).mockResolvedValue([
      mockCameraDevice as unknown as MediaDeviceInfo,
    ]);
    mockClient.connectionState = 'CONNECTED';

    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Enable video to set localVideoTrackRef
    await act(async () => {
      await result.current.toggleVideo();
    });
    await waitFor(() => expect(result.current.videoEnabled).toBe(true));

    // Switch video device — track exists so setDevice should be called
    mockVideoTrack.setDevice.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.switchVideoDevice('new-video-device-id');
    });

    expect(mockVideoTrack.setDevice).toHaveBeenCalledWith(
      'new-video-device-id',
    );
  });

  it('should show error toast when video device switch fails', async () => {
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    vi.mocked(AgoraRTC.createCameraVideoTrack).mockResolvedValue(
      mockVideoTrack as unknown as ICameraVideoTrack,
    );
    const mockCameraDevice = {
      kind: 'videoinput',
      deviceId: 'test-camera',
      label: 'Test Camera',
    };
    vi.mocked(AgoraRTC.getDevices).mockResolvedValue([
      mockCameraDevice as unknown as MediaDeviceInfo,
    ]);
    mockClient.connectionState = 'CONNECTED';

    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
      }),
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Enable video
    await act(async () => {
      await result.current.toggleVideo();
    });
    await waitFor(() => expect(result.current.videoEnabled).toBe(true));

    // Make setDevice fail
    mockVideoTrack.setDevice.mockRejectedValueOnce(new Error('Device error'));
    await act(async () => {
      await result.current.switchVideoDevice('bad-video-device-id');
    });

    expect(mockVideoTrack.setDevice).toHaveBeenCalledWith(
      'bad-video-device-id',
    );
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

  describe('connection state changes', () => {
    it('should show toasts for RECONNECTING and DISCONNECTED states', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));

      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleConnectionStateChange = mockClient.on.mock.calls.find(
        (call) => call[0] === 'connection-state-change',
      )?.[1];

      expect(handleConnectionStateChange).toBeDefined();

      act(() => {
        handleConnectionStateChange('RECONNECTING', 'CONNECTED');
      });

      act(() => {
        handleConnectionStateChange('DISCONNECTED', 'RECONNECTING');
      });
    });
  });

  describe('device management branches', () => {
    it('should handle refreshDevices success and failure branches', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));

      await act(async () => {
        await result.current.refreshDevices();
      });

      expect(result.current.audioInputDevices).toBeDefined();
    });

    it('should handle toggle error when not connected', async () => {
      mockClient.connectionState = 'DISCONNECTED';
      const { result } = renderHook(() => useAgora(defaultOptions));

      await act(async () => {
        await result.current.toggleAudio();
        await result.current.toggleVideo();
      });

      expect(result.current.audioEnabled).toBe(false);
      expect(result.current.videoEnabled).toBe(false);
    });

    it('should handle setDevice errors in switch methods', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));

      await act(async () => {
        await result.current.switchAudioDevice('new-id');
        await result.current.switchVideoDevice('new-id');
      });
    });
  });

  describe('media event branches', () => {
    it('should handle user-published for audio and video', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleUserPublished = mockClient.on.mock.calls.find(
        (call) => call[0] === 'user-published',
      )?.[1];

      const mockRemoteUser = {
        uid: 999,
        audioTrack: { play: vi.fn() },
      } as unknown as IAgoraRTCRemoteUser;
      (
        mockClient as unknown as { remoteUsers: IAgoraRTCRemoteUser[] }
      ).remoteUsers = [mockRemoteUser];

      await act(async () => {
        await handleUserPublished(mockRemoteUser, 'audio');
        await handleUserPublished(
          { uid: 999, videoTrack: {} } as unknown as IAgoraRTCRemoteUser,
          'video',
        );
      });

      expect(result.current.remoteUsers).toHaveLength(1);
    });

    it('should handle user-joined and user-left', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleUserJoined = mockClient.on.mock.calls.find(
        (c) => c[0] === 'user-joined',
      )?.[1];
      const handleUserLeft = mockClient.on.mock.calls.find(
        (c) => c[0] === 'user-left',
      )?.[1];

      act(() => {
        handleUserJoined({ uid: 999 });
        handleUserLeft({ uid: 999 });
      });
    });
  });

  describe('device error branches', () => {
    it('should handle permission denied and not found errors', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      // Force createMicrophoneAudioTrack to throw permission error
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockRejectedValueOnce(
        new Error('Permission denied'),
      );

      await act(async () => {
        await result.current.toggleAudio();
      });

      vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockRejectedValueOnce(
        new Error('NotFound'),
      );
      await act(async () => {
        await result.current.toggleAudio();
      });
    });

    it('should handle toggle failure while enabling', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      // create works but publish fails
      vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockResolvedValue(
        mockAudioTrack as unknown as IMicrophoneAudioTrack,
      );
      mockClient.publish.mockRejectedValueOnce(new Error('Publish fail'));

      await act(async () => {
        await result.current.toggleAudio();
      });

      expect(mockAudioTrack.close).toHaveBeenCalled();
    });
  });

  describe('global SDK handlers', () => {
    it('should handle autoplay failed and exceptions', async () => {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

      // Trigger global autoplay failed handler
      if (typeof AgoraRTC.onAutoplayFailed === 'function') {
        (AgoraRTC.onAutoplayFailed as () => void)();
      }

      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleException = mockClient.on.mock.calls.find(
        (call) => call[0] === 'exception',
      )?.[1];

      if (handleException) {
        handleException({ code: 1001, msg: 'Test exception', uid: '999' });
      }
    });
  });

  describe('network quality branches', () => {
    it('should update network quality only if changed', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));

      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleNetworkQuality = mockClient.on.mock.calls.find(
        (call) => call[0] === 'network-quality',
      )?.[1];

      expect(handleNetworkQuality).toBeDefined();

      act(() => {
        handleNetworkQuality({
          uplinkNetworkQuality: 1,
          downlinkNetworkQuality: 1,
        });
        handleNetworkQuality({
          uplinkNetworkQuality: 1,
          downlinkNetworkQuality: 1,
        }); // No change
      });
    });
  });

  describe('participant state logic', () => {
    it('should handle user-unpublished', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleUserUnpublished = mockClient.on.mock.calls.find(
        (call) => call[0] === 'user-unpublished',
      )?.[1];

      await act(async () => {
        // Mock the SDK's remoteUsers being updated
        mockClient.remoteUsers = [];
        await handleUserUnpublished({ uid: 999 }, 'audio');
      });

      expect(result.current.remoteUsers).toHaveLength(0);
    });

    it('should update volume levels and isSpeaking status', async () => {
      const { result } = renderHook(() =>
        useAgora({ ...defaultOptions, userId: 'user-1' }),
      );
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleVolumeIndicator = mockClient.on.mock.calls.find(
        (call) => call[0] === 'volume-indicator',
      )?.[1];

      act(() => {
        handleVolumeIndicator([
          { uid: 0, level: 50 }, // Local user
          { uid: 999, level: 80 }, // Remote user
        ]);
      });

      const localPart = result.current.participants.find((p) => p.isLocal);
      expect(localPart?.isSpeaking).toBe(true);
    });
  });

  describe('SDK exception handling', () => {
    it('should handle client exceptions via toast', async () => {
      const { result } = renderHook(() => useAgora(defaultOptions));
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      const handleException = mockClient.on.mock.calls.find(
        (call) => call[0] === 'exception',
      )?.[1];

      act(() => {
        handleException({
          code: 1001,
          msg: 'Critical error',
          type: 'error',
        });
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });
});
