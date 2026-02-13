import { renderHook, waitFor } from '@testing-library/react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { describe, expect, it, vi } from 'vitest';
import { useAgora } from '@/features/watch-party/hooks/useAgora';

// Mock Agora SDK
vi.mock('agora-rtc-sdk-ng', () => {
  const mockClient = {
    on: vi.fn(),
    off: vi.fn(),
    join: vi.fn().mockResolvedValue(1),
    leave: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    unpublish: vi.fn().mockResolvedValue(undefined),
    enableAudioVolumeIndicator: vi.fn(),
    remoteUsers: [],
  };

  return {
    default: {
      createClient: vi.fn().mockReturnValue(mockClient),
      onAutoplayFailed: vi.fn(),
      setLogLevel: vi.fn(),
      getDevices: vi.fn().mockResolvedValue([]),
    },
    createClient: vi.fn().mockReturnValue(mockClient),
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

  it('should initialize with all participants mapped from members immediately', async () => {
    const { result } = renderHook(() =>
      useAgora({
        ...defaultOptions,
        userId: 'user-1',
        uid: 3550198,
      }),
    );

    await waitFor(() => {
      expect(result.current.participants).toHaveLength(2);
    });

    const localPart = result.current.participants.find((p) => p.isLocal);
    const remotePart = result.current.participants.find((p) => !p.isLocal);

    expect(localPart?.name).toBe('You');
    expect(localPart?.identity).toBe('user-1');
    expect(remotePart?.name).toBe('Guest Name');
    expect(remotePart?.identity).toBe('user-2');

    // Check metadata for local avatar
    if (localPart?.metadata) {
      const metadata = JSON.parse(localPart.metadata);
      expect(metadata.avatar).toBe('https://host.com/photo.jpg');
    }
  });

  it('should handle participants without profile photos correctly', async () => {
    // User 2 has no profile photo
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
    expect(localPart?.metadata).toBeUndefined();
  });
});
