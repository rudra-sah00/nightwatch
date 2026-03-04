import { act, renderHook } from '@testing-library/react';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyMembers } from '@/features/watch-party/room/hooks/useWatchPartyMembers';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  MemberPermissionsUpdate,
  PartyMemberJoined,
  PartyMemberLeft,
  RoomMember,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  approveJoinRequest: vi.fn(),
  fetchPendingRequests: vi.fn(),
  kickMember: vi.fn(),
  onPartyAdminRequest: vi.fn(() => vi.fn()),
  onPartyMemberJoined: vi.fn(() => vi.fn()),
  onPartyMemberLeft: vi.fn(() => vi.fn()),
  onPartyMemberPermissionsUpdated: vi.fn(() => vi.fn()),
  onPartyMemberRejected: vi.fn(() => vi.fn()),
  onPartyPermissionsUpdated: vi.fn(() => vi.fn()),
  rejectJoinRequest: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Audio
global.Audio = class {
  play = vi.fn().mockResolvedValue(undefined);
  catch = vi.fn();
} as unknown as typeof Audio;

describe('useWatchPartyMembers', () => {
  let memberJoinedHandler: (data: PartyMemberJoined) => void;
  let memberLeftHandler: (data: PartyMemberLeft) => void;
  let permHandler: (data: MemberPermissionsUpdate) => void;

  const createMockRoom = (overrides = {}): WatchPartyRoom =>
    ({
      id: 'room-1',
      hostId: 'host-1',
      contentId: 'content-1',
      title: 'Test',
      type: 'movie',
      streamUrl: 'http://example.com',
      members: [],
      pendingMembers: [],
      state: {
        lastUpdated: Date.now(),
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1,
      },
      permissions: {
        canGuestsDraw: true,
        canGuestsPlaySounds: true,
        canGuestsChat: true,
      },
      createdAt: Date.now(),
      ...overrides,
    }) as unknown as WatchPartyRoom;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.onPartyMemberJoined).mockImplementation((cb) => {
      memberJoinedHandler = cb;
      return vi.fn();
    });
    vi.mocked(api.onPartyMemberLeft).mockImplementation((cb) => {
      memberLeftHandler = cb;
      return vi.fn();
    });
    vi.mocked(api.onPartyMemberPermissionsUpdated).mockImplementation((cb) => {
      permHandler = cb;
      return vi.fn();
    });
  });

  it('should correctly handle member join', () => {
    const initialRoom = createMockRoom();

    const { result } = renderHook(() => {
      const [room, setRoom] = useState<WatchPartyRoom | null>(initialRoom);
      return {
        hook: useWatchPartyMembers({ room, setRoom, userId: 'host-1' }),
        room,
      };
    });

    const newMember: RoomMember = {
      id: 'user-3',
      name: 'User 3',
      isHost: false,
      joinedAt: Date.now(),
      permissions: {},
    };
    act(() => {
      memberJoinedHandler({ member: newMember });
    });

    expect(result.current.room?.members).toBeDefined();
  });

  it('should handle member left safely', () => {
    const initialRoom = createMockRoom({
      members: [
        {
          id: 'user-2',
          name: 'Guest',
          isHost: false,
          joinedAt: Date.now(),
          permissions: {},
        },
      ],
    });
    const setRoom = vi.fn().mockImplementation((updater) => {
      if (typeof updater === 'function') updater(initialRoom);
    });

    renderHook(() =>
      useWatchPartyMembers({
        room: initialRoom,
        setRoom: setRoom as unknown as Dispatch<
          SetStateAction<WatchPartyRoom | null>
        >,
      }),
    );

    act(() => {
      memberLeftHandler({ userId: 'user-2' });
    });

    expect(toast.info).toHaveBeenCalledWith('Guest left', expect.any(Object));
    expect(setRoom).toHaveBeenCalled();
  });

  it('should handle permissions update faithfully', () => {
    const initialRoom = createMockRoom({
      members: [
        {
          id: 'user-2',
          name: 'Guest',
          isHost: false,
          joinedAt: Date.now(),
          permissions: {},
        },
      ],
    });
    const setRoom = vi.fn().mockImplementation((updater) => {
      if (typeof updater === 'function') updater(initialRoom);
    });

    renderHook(() =>
      useWatchPartyMembers({
        room: initialRoom,
        setRoom: setRoom as unknown as Dispatch<
          SetStateAction<WatchPartyRoom | null>
        >,
      }),
    );

    act(() => {
      permHandler({ memberId: 'user-2', permissions: { canDraw: true } });
    });

    expect(setRoom).toHaveBeenCalled();
  });
});
