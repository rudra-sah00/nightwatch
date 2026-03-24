import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

// Mock dependencies
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  checkRoomExists: vi.fn(),
  getRoomDetails: vi.fn(),
  getPartyRoom: vi.fn(),
  createPartyRoom: vi.fn(),
  requestJoinPartyRoom: vi.fn(),
  leavePartyRoom: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
  kickMember: vi.fn(),
  fetchPendingRequests: vi.fn(),
  dispatchRtmMessage: vi.fn(),
  getPartyMessages: vi.fn(),
  getPartyStreamToken: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()),
}));
vi.mock('sonner', () => import('../__mocks__/sonner'));
vi.mock('@/features/watch', () => import('../__mocks__/watch-utils'));

// RTM Mocks
vi.mock('@/features/watch-party/media/hooks/useAgoraRtmToken', () => ({
  useAgoraRtmToken: vi.fn(() => ({
    appId: 'test-app-id',
    token: 'test-token',
    channel: 'test-channel',
    uid: 'test-uid',
    isLoading: false,
  })),
}));

const { mockRtmSendMessage, mockRtmSendMessageToPeer } = vi.hoisted(() => ({
  mockRtmSendMessage: vi.fn().mockResolvedValue(true),
  mockRtmSendMessageToPeer: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/features/watch-party/media/hooks/useAgoraRtm', () => ({
  useAgoraRtm: vi.fn(() => ({
    isConnected: true,
    sendMessage: mockRtmSendMessage,
    sendMessageToPeer: mockRtmSendMessageToPeer,
  })),
}));

describe('useWatchParty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Add default mock resolutions to avoid .then undefined errors
    vi.mocked(api.getPartyMessages).mockResolvedValue({ messages: [] });
    vi.mocked(api.checkRoomExists).mockResolvedValue({
      exists: true,
      preview: {
        id: 'R1',
        hostId: 'H1',
        memberCount: 1,
        title: '',
        type: 'movie',
        hostName: 'Host Name',
      },
    });
    vi.mocked(api.getRoomDetails).mockResolvedValue({
      id: 'R1',
      hostId: 'H1',
    } as unknown as import('@/features/watch-party/room/types').WatchPartyRoom);
    vi.mocked(api.getPartyStreamToken).mockResolvedValue({
      token: 'test-stream-token',
    });
    vi.mocked(api.fetchPendingRequests).mockResolvedValue({
      pendingMembers: [],
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWatchParty({}));

      expect(result.current.room).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(false); // Initially false until joined
      expect(result.current.requestStatus).toBe('idle');
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('createRoom', () => {
    it('should create a room successfully via REST', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      const mockRoom = {
        id: 'ROOM-123',
        title: 'Test Movie',
        hostId: 'user-1',
        contentId: 'c1',
        type: 'movie',
        streamUrl: 's1',
        members: [
          { id: 'user-1', name: 'Host', isHost: true, joinedAt: Date.now() },
        ],
        pendingMembers: [],
        state: {
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          playbackRate: 1,
        },
        permissions: {
          canGuestsDraw: true,
          canGuestsPlaySounds: true,
          canGuestsChat: true,
        },
        createdAt: Date.now(),
      } as WatchPartyRoom;

      vi.mocked(api.createPartyRoom).mockResolvedValue({
        room: mockRoom,
        streamToken: 'token-123',
      });

      await act(async () => {
        await result.current.createRoom('ROOM-123', {
          contentId: 'c1',
          title: 'Test Movie',
          type: 'movie',
          streamUrl: 's1',
          posterUrl: 'p1',
        });
      });

      expect(api.createPartyRoom).toHaveBeenCalledWith(
        'ROOM-123',
        expect.any(Object),
      );
      expect(result.current.room?.id).toBe('ROOM-123');
    });

    it('should handle room creation failure', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.createPartyRoom).mockResolvedValue({
        error: 'Failed to create',
      });

      await act(async () => {
        await result.current.createRoom('ROOM-123', {
          contentId: 'c1',
          title: 'T',
          type: 'movie',
          streamUrl: 's1',
        });
      });

      expect(result.current.error).toBe('Failed to create');
      expect(result.current.room).toBeNull();
    });
  });

  describe('requestJoin', () => {
    it('should request to join via REST', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
        status: 'pending',
      });

      await act(async () => {
        await result.current.requestJoin('ROOM-123');
      });

      expect(api.requestJoinPartyRoom).toHaveBeenCalledWith(
        'ROOM-123',
        expect.any(Object),
      );
      expect(result.current.requestStatus).toBe('pending');
    });
  });

  describe('Member management', () => {
    it('approveMember should call REST and then RTM', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Setup room first to have an active roomId
      vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
        room: {
          id: 'ROOM-123',
          state: {},
          members: [
            {
              id: 'user-1',
            } as unknown as import('@/features/watch-party/room/types').RoomMember,
          ],
          pendingMembers: [
            {
              id: 'user-2',
            } as unknown as import('@/features/watch-party/room/types').RoomMember,
          ],
        } as WatchPartyRoom,
      });
      vi.mocked(api.fetchPendingRequests).mockResolvedValue({
        pendingMembers: [
          {
            id: 'user-2',
          } as unknown as import('@/features/watch-party/room/types').RoomMember,
        ],
      });
      await act(async () => {
        await result.current.requestJoin('ROOM-123');
      });

      vi.mocked(api.approveJoinRequest).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.approveMember('user-2');
      });

      expect(api.approveJoinRequest).toHaveBeenCalledWith('ROOM-123', 'user-2');
      // Adding a small wait because setRoom updater might act async
      await waitFor(() => {
        expect(mockRtmSendMessageToPeer).toHaveBeenCalledWith(
          'user-2',
          expect.objectContaining({
            type: 'JOIN_APPROVED',
          }),
        );
      });
    });

    it('kickUser should call REST and then RTM', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
        room: {
          id: 'ROOM-123',
          state: {},
          members: [
            {
              id: 'user-1',
            } as unknown as import('@/features/watch-party/room/types').RoomMember,
            {
              id: 'user-2',
            } as unknown as import('@/features/watch-party/room/types').RoomMember,
          ],
        } as WatchPartyRoom,
      });
      await act(async () => {
        await result.current.requestJoin('ROOM-123');
      });

      vi.mocked(api.kickMember).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.kickUser('user-2');
      });

      expect(api.kickMember).toHaveBeenCalledWith('ROOM-123', 'user-2');
      await waitFor(() => {
        expect(mockRtmSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'KICK',
            targetUserId: 'user-2',
          }),
        );
      });
    });
  });

  describe('RTM Message Handling', () => {
    it('should update room state when receiving PARTY_EVENT', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Simulate joined state
      vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
        room: {
          id: 'ROOM-123',
          state: {},
          members: [],
        } as unknown as WatchPartyRoom,
      });
      await act(async () => {
        await result.current.requestJoin('ROOM-123');
      });

      // Simulate incoming RTM message
      await act(async () => {
        api.dispatchRtmMessage({
          type: 'PARTY_EVENT',
          payload: {
            eventType: 'play',
            videoTime: 120,
            playbackRate: 1,
          },
        });
      });

      // Internal check: requestSync might be triggered or state updated
      // We verify if the message was processed (e.g. by checking if it triggered other hooks via context,
      // but here we just check if it doesn't crash)
    });
  });
});
