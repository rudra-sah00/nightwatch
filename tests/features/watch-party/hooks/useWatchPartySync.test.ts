import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartySync } from '@/features/watch-party/room/hooks/useWatchPartySync';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  PartyStateUpdate,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  emitPartyEvent: vi.fn(),
  getPartyStreamToken: vi.fn(),
  onPartyContentUpdated: vi.fn(() => vi.fn()),
  onPartyHostDisconnected: vi.fn(() => vi.fn()),
  onPartyHostReconnected: vi.fn(() => vi.fn()),
  onPartyStateUpdate: vi.fn(() => vi.fn()),
  updatePartyContent: vi.fn(),
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
  let stateUpdateHandler: (data: PartyStateUpdate) => void;
  let room: WatchPartyRoom;
  let setRoom: Dispatch<SetStateAction<WatchPartyRoom | null>>;
  const normalizeRoomUrls = vi.fn((r) => r);

  beforeEach(() => {
    vi.clearAllMocks();
    room = {
      id: 'room-1',
      title: 'Old Title',
      state: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        playbackRate: 1,
      },
    } as unknown as WatchPartyRoom;
    setRoom = vi.fn();

    vi.mocked(api.onPartyStateUpdate).mockImplementation((cb) => {
      stateUpdateHandler = cb;
      return vi.fn();
    });
  });

  it('should handle state update event', () => {
    renderHook(() => useWatchPartySync({ room, setRoom, normalizeRoomUrls }));

    const newState: PartyStateUpdate = {
      currentTime: 100,
      isPlaying: true,
      timestamp: Date.now(),
    };
    act(() => {
      stateUpdateHandler(newState);
    });

    expect(setRoom).toHaveBeenCalled();
  });

  it('should emit party event', () => {
    const { result } = renderHook(() =>
      useWatchPartySync({ room, setRoom, normalizeRoomUrls }),
    );

    act(() => {
      result.current.emitEvent({ eventType: 'play', videoTime: 10 });
    });

    expect(api.emitPartyEvent).toHaveBeenCalledWith({
      eventType: 'play',
      videoTime: 10,
    });
  });

  it('should handle content update', () => {
    vi.mocked(api.updatePartyContent).mockImplementation((_payload, cb) => {
      cb({ success: true, room: { ...room, title: _payload.title } });
    });

    const { result } = renderHook(() =>
      useWatchPartySync({ room, setRoom, normalizeRoomUrls }),
    );

    act(() => {
      result.current.updateContent({ title: 'New Title', type: 'movie' });
    });

    expect(api.updatePartyContent).toHaveBeenCalled();
    expect(setRoom).toHaveBeenCalled();
  });
});
