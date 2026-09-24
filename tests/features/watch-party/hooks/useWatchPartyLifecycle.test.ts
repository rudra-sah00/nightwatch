import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyLifecycle } from '@/features/watch-party/room/hooks/useWatchPartyLifecycle';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
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
    sessionStorage.clear();
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
    const mockRoom = { id: 'room-1', title: 'Test Room' } as WatchPartyRoom;
    vi.mocked(api.createPartyRoom).mockResolvedValue({
      room: mockRoom,
      streamToken: 'token',
    });

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    await act(async () => {
      await result.current.createRoom('room-1', {
        contentId: '1',
        title: 'Test',
        type: 'movie',
        streamUrl: 'http://test.com',
      });
    });

    expect(api.createPartyRoom).toHaveBeenCalledWith(
      'room-1',
      expect.any(Object),
    );
    expect(props.setRoom).toHaveBeenCalled();
    expect(props.setIsConnected).toHaveBeenCalledWith(true);
    expect(props.setRequestStatus).toHaveBeenCalledWith('joined');
  });

  it('should handle request join - pending', async () => {
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      status: 'pending',
    });

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    await act(async () => {
      await result.current.requestJoin('room-1', 'User 1');
    });

    expect(api.requestJoinPartyRoom).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ name: 'User 1' }),
    );
    expect(props.setRequestStatus).toHaveBeenCalledWith('pending');
  });

  it('should handle request join - immediate success (re-joining with token)', async () => {
    const mockRoom = { id: 'room-1' } as WatchPartyRoom;
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      room: mockRoom,
      guestToken: 'guest-123',
    });
    vi.mocked(api.getPartyStreamToken).mockResolvedValue({
      token: 'stream-123',
    });

    const { result } = renderHook(() => useWatchPartyLifecycle(props));

    await act(async () => {
      await result.current.requestJoin('room-1', 'User 1');
    });

    expect(sessionStorage.getItem('guest_token')).toBe('guest-123');
    expect(props.setIsConnected).toHaveBeenCalledWith(true);
    expect(props.setRequestStatus).toHaveBeenCalledWith('joined');
  });

  it('should handle leave room', async () => {
    vi.mocked(api.leavePartyRoom).mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useWatchPartyLifecycle({
        ...props,
        room: {
          id: 'room-1',
        } as unknown as import('@/features/watch-party/room/types').WatchPartyRoom,
      }),
    );

    await act(async () => {
      await result.current.leaveRoom();
    });

    expect(api.leavePartyRoom).toHaveBeenCalledWith('room-1');
    expect(props.setRoom).toHaveBeenCalledWith(null);
    expect(props.setIsConnected).toHaveBeenCalledWith(false);
    expect(props.setRequestStatus).toHaveBeenCalledWith('idle');
  });

  it('should handle cancelRequest', async () => {
    vi.mocked(api.leavePartyRoom).mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useWatchPartyLifecycle({ ...props, requestStatus: 'pending' }),
    );

    await act(async () => {
      await result.current.cancelRequest('room-1');
    });

    expect(api.leavePartyRoom).toHaveBeenCalledWith('room-1');
    expect(props.setRequestStatus).toHaveBeenCalledWith('idle');
  });

  describe('announcing a departure', () => {
    /*
      Nothing in the frontend used to emit MEMBER_LEFT, so the only signal a guest
      had gone was an Agora presence LEAVE — which merely flags the member
      `disconnected`, and for a dropped socket arrives as a REMOTE_TIMEOUT whenever
      Agora gets round to it. In the 3D theatre that leaves a body sitting in a
      chair and a seat claim that outlives its owner; because the deterministic
      claim rule favours the EARLIEST timestamp, that chair then refuses every
      later claim.
    */
    it('tells the channel a guest has left, before calling the backend', async () => {
      vi.mocked(api.leavePartyRoom).mockResolvedValue({ success: true });
      const rtmSendMessage = vi.fn();
      const order: string[] = [];
      rtmSendMessage.mockImplementation(() => order.push('rtm'));
      vi.mocked(api.leavePartyRoom).mockImplementation(async () => {
        order.push('rest');
        return { success: true };
      });

      const { result } = renderHook(() =>
        useWatchPartyLifecycle({
          ...props,
          room: { id: 'room-1', hostId: 'host-1' } as WatchPartyRoom,
          userId: 'guest-9',
          rtmSendMessage,
        }),
      );

      await act(async () => {
        await result.current.leaveRoom();
      });

      expect(rtmSendMessage).toHaveBeenCalledWith({
        type: 'MEMBER_LEFT',
        userId: 'guest-9',
      });
      // Published while still subscribed: an unsubscribed channel sends nothing,
      // and this client navigates away the moment the REST call resolves.
      expect(order).toEqual(['rtm', 'rest']);
    });

    it('sends PARTY_CLOSED and no MEMBER_LEFT when the host ends the party', async () => {
      // The host's leave destroys the room for everybody, so a per-member
      // departure is noise — and the guests are gone before it could matter.
      vi.mocked(api.leavePartyRoom).mockResolvedValue({ success: true });
      const rtmSendMessage = vi.fn();

      const { result } = renderHook(() =>
        useWatchPartyLifecycle({
          ...props,
          room: { id: 'room-1', hostId: 'host-1' } as WatchPartyRoom,
          userId: 'host-1',
          rtmSendMessage,
        }),
      );

      await act(async () => {
        await result.current.leaveRoom();
      });

      const types = rtmSendMessage.mock.calls.map((c) => c[0].type);
      expect(types).toContain('PARTY_CLOSED');
      expect(types).not.toContain('MEMBER_LEFT');
    });
  });
});
