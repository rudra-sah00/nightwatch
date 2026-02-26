import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyLifecycle } from '@/features/watch-party/hooks/useWatchPartyLifecycle';
import * as api from '@/features/watch-party/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/types';

vi.mock('@/features/watch-party/services/watch-party.api', () => ({
  createPartyRoom: vi.fn(),
  getPartyStreamToken: vi.fn(),
  leavePartyRoom: vi.fn(),
  requestJoinPartyRoom: vi.fn(),
}));

describe('useWatchPartyLifecycle', () => {
  type HookProps = Parameters<typeof useWatchPartyLifecycle>[0];
  let props: HookProps;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      setRoom: vi.fn(),
      setIsConnected: vi.fn(),
      setRequestStatus: vi.fn(),
      setMessages: vi.fn(),
      setError: vi.fn(),
      setErrorCode: vi.fn(),
      setIsLoading: vi.fn(),
      requestStatus: 'idle',
      normalizeRoomUrls: vi.fn((r) => r),
    };
  });

  it('should create room successfully', async () => {
    vi.mocked(api.createPartyRoom).mockImplementation((_payload, cb) => {
      cb({
        success: true,
        room: { id: 'room-1', title: 'Test Room' } as unknown as WatchPartyRoom,
        streamToken: 'token',
      });
    });

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    await act(async () => {
      await result.current.createRoom({
        contentId: '1',
        title: 'Test',
        type: 'movie',
        streamUrl: 'http://test.com',
      });
    });

    expect(api.createPartyRoom).toHaveBeenCalled();
    expect(props.setRoom).toHaveBeenCalled();
    expect(props.setIsConnected).toHaveBeenCalledWith(true);
    expect(props.setRequestStatus).toHaveBeenCalledWith('joined');
  });

  it('should handle request join - pending', async () => {
    vi.mocked(api.requestJoinPartyRoom).mockImplementation((_payload, cb) => {
      cb({ success: true }); // pending status implicitly if no room returned
    });

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    await act(async () => {
      await result.current.requestJoin('room-1', 'User 1');
    });

    expect(api.requestJoinPartyRoom).toHaveBeenCalled();
    expect(props.setRequestStatus).toHaveBeenCalledWith('pending');
  });

  it('should handle leave room', () => {
    vi.mocked(api.leavePartyRoom).mockImplementation((cb) =>
      cb({ success: true }),
    );

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    act(() => {
      result.current.leaveRoom();
    });

    expect(api.leavePartyRoom).toHaveBeenCalled();
    expect(props.setRoom).toHaveBeenCalledWith(null);
    expect(props.setIsConnected).toHaveBeenCalledWith(false);
    expect(props.setRequestStatus).toHaveBeenCalledWith('idle');
  });
});
