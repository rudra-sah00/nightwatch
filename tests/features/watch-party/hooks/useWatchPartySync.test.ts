import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartySync } from '@/features/watch-party/room/hooks/useWatchPartySync';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  syncPartyState: vi.fn(),
  updatePartyContent: vi.fn(),
  getPartyStreamToken: vi.fn().mockResolvedValue({ token: 'abc' }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useWatchPartySync', () => {
  const mockSetRoom = vi.fn();
  const mockRtmSendMessage = vi.fn();
  const mockNormalizeRoomUrls = vi.fn((r) => r);

  const mockRoom = {
    id: 'room-1',
    title: 'Movie',
    hostId: 'host-1',
    state: {
      currentTime: 0,
      isPlaying: false,
      lastUpdated: Date.now(),
      playbackRate: 1,
    },
  } as unknown as WatchPartyRoom;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    room: mockRoom,
    setRoom: mockSetRoom,
    userId: 'user-1',
    rtmSendMessage: mockRtmSendMessage,
    normalizeRoomUrls: mockNormalizeRoomUrls,
  };

  it('emitEvent should broadcast RTM and sync to REST', () => {
    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    act(() => {
      result.current.emitEvent({ eventType: 'play', videoTime: 120 });
    });

    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PLAY_EVENT',
        videoTime: 120,
      }),
    );
    expect(api.syncPartyState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        currentTime: 120,
        isPlaying: true,
      }),
    );
  });

  it('updateContent should call REST and then RTM broadcast', async () => {
    const updatedRoom = { ...mockRoom, title: 'New Movie' };
    vi.mocked(api.updatePartyContent).mockResolvedValue({ room: updatedRoom });

    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    await act(async () => {
      await result.current.updateContent({ title: 'New Movie', type: 'movie' });
    });

    expect(api.updatePartyContent).toHaveBeenCalledWith(
      'room-1',
      expect.any(Object),
    );
    expect(mockSetRoom).toHaveBeenCalledWith(updatedRoom);
    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CONTENT_UPDATED',
        room: updatedRoom,
      }),
    );
  });

  it('handleIncomingRtmMessage should update room for PLAY_EVENT', () => {
    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    act(() => {
      result.current.handleIncomingRtmMessage({
        type: 'PLAY_EVENT',
        videoTime: 300,
        serverTime: Date.now(),
      } as RTMMessage);
    });

    expect(mockSetRoom).toHaveBeenCalled();
  });

  it('handleIncomingRtmMessage should handle HOST_DISCONNECTED', () => {
    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    act(() => {
      result.current.handleIncomingRtmMessage({
        type: 'HOST_DISCONNECTED',
        graceSeconds: 30,
        message: 'Host left',
      } as RTMMessage);
    });

    expect(toast.warning).toHaveBeenCalled();
  });

  it('handlePresenceEvent should trigger 30s auto-exit if host disconnects and fails to return', async () => {
    vi.useFakeTimers();
    const mockWindow = { location: { href: '' } };
    vi.stubGlobal('window', mockWindow);
    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    act(() => {
      result.current.handlePresenceEvent({
        action: 'LEAVE',
        userId: 'host-1', // Matches room.hostId
      });
    });

    expect(result.current.hostDisconnected).toBe(true);
    expect(mockWindow.location.href).toBe('');

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockWindow.location.href).toBe('/home');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('handlePresenceEvent should clear 30s disconnect timeout if host rejoins', async () => {
    vi.useFakeTimers();
    const mockWindow = { location: { href: '' } };
    vi.stubGlobal('window', mockWindow);
    const { result } = renderHook(() => useWatchPartySync(defaultProps));

    act(() => {
      result.current.handlePresenceEvent({
        action: 'LEAVE',
        userId: 'host-1',
      });
    });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    act(() => {
      result.current.handlePresenceEvent({
        action: 'JOIN',
        userId: 'host-1',
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(20000);
    });

    expect(result.current.hostDisconnected).toBe(false);
    expect(mockWindow.location.href).toBe(''); // Did not redirect
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
