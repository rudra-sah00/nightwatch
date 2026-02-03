import { act, renderHook, waitFor } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/api';
import type { RoomMember } from '@/features/watch-party/types';
import { useWatchParty } from '@/features/watch-party/useWatchParty';
import * as ws from '@/lib/ws';

// Mock dependencies
vi.mock('@/lib/ws');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));
vi.mock('@/features/watch-party/api', () => ({
  createPartyRoom: vi.fn(),
  requestJoinPartyRoom: vi.fn(),
  leavePartyRoom: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
  kickMember: vi.fn(),
  sendPartyMessage: vi.fn(),
  getPartyMessages: vi.fn(),
  getPartyStreamToken: vi.fn(),
  syncPartyState: vi.fn(),
  updatePartyContent: vi.fn(),
  emitTypingStart: vi.fn(),
  emitTypingStop: vi.fn(),
  onPartyStateUpdate: vi.fn(() => vi.fn()),
  onPartyMemberJoined: vi.fn(() => vi.fn()),
  onPartyMemberLeft: vi.fn(() => vi.fn()),
  onPartyMemberRejected: vi.fn(() => vi.fn()),
  onPartyAdminRequest: vi.fn(() => vi.fn()),
  onPartyJoinApproved: vi.fn(() => vi.fn()),
  onPartyJoinRejected: vi.fn(() => vi.fn()),
  onPartyKicked: vi.fn(() => vi.fn()),
  onPartyClosed: vi.fn(() => vi.fn()),
  onPartyMessage: vi.fn(() => vi.fn()),
  onPartyContentUpdated: vi.fn(() => vi.fn()),
  onUserTyping: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/features/watch', () => ({
  injectTokenIntoUrl: vi.fn((url, token) => {
    if (!url || !token) return url;
    return url.replace('{token}', token).replace(/\{token\}/g, token);
  }),
}));

describe('useWatchParty', () => {
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      connected: true,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };
    vi.mocked(ws.getSocket).mockReturnValue(mockSocket as Socket);
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWatchParty({}));

      expect(result.current.room).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.requestStatus).toBe('idle');
      expect(result.current.messages).toEqual([]);
    });

    it('should register event listeners on mount', () => {
      renderHook(() => useWatchParty({}));

      expect(api.onPartyStateUpdate).toHaveBeenCalledWith(expect.any(Function));
      expect(api.onPartyMemberJoined).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(api.onPartyMemberLeft).toHaveBeenCalledWith(expect.any(Function));
      expect(api.onPartyAdminRequest).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(api.onPartyJoinApproved).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(api.onPartyJoinRejected).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(api.onPartyKicked).toHaveBeenCalledWith(expect.any(Function));
      expect(api.onPartyClosed).toHaveBeenCalledWith(expect.any(Function));
      expect(api.onPartyMessage).toHaveBeenCalledWith(expect.any(Function));
      expect(api.onPartyContentUpdated).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should unregister event listeners on unmount', () => {
      const mockCleanups = [
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
      ];

      // Mock all event listeners to return cleanup functions
      vi.mocked(api.onPartyStateUpdate).mockReturnValue(mockCleanups[0]);
      vi.mocked(api.onPartyMemberJoined).mockReturnValue(mockCleanups[1]);
      vi.mocked(api.onPartyMemberLeft).mockReturnValue(mockCleanups[2]);
      vi.mocked(api.onPartyAdminRequest).mockReturnValue(mockCleanups[3]);
      vi.mocked(api.onPartyJoinApproved).mockReturnValue(mockCleanups[4]);
      vi.mocked(api.onPartyJoinRejected).mockReturnValue(mockCleanups[5]);
      vi.mocked(api.onPartyKicked).mockReturnValue(mockCleanups[6]);
      vi.mocked(api.onPartyClosed).mockReturnValue(mockCleanups[7]);
      vi.mocked(api.onPartyMessage).mockReturnValue(mockCleanups[8]);
      vi.mocked(api.onPartyContentUpdated).mockReturnValue(mockCleanups[9]);

      const { unmount } = renderHook(() => useWatchParty({}));

      unmount();

      // All cleanup functions should have been called
      mockCleanups.forEach((cleanup) => {
        expect(cleanup).toHaveBeenCalled();
      });
    });
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'content-1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/stream.m3u8',
              title: 'Test Movie',
              hostId: 'user-1',
              createdAt: Date.now(),

              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
            },
          });
        },
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test Movie',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.room).not.toBeNull();
        expect(result.current.room?.id).toBe('room-1');
      });
    });

    it('should handle room creation failure', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: false,
            error: 'Failed to create room',
            code: 'CREATE_FAILED',
          });
        },
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test Movie',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to create room');
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('requestJoin', () => {
    it('should request to join a room', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.requestJoin('room-1');
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('pending');
      });
    });

    it('should handle join request failure', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: false, error: 'Room not found' });
        },
      );

      await act(async () => {
        result.current.requestJoin('invalid-room');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Room not found');
        expect(result.current.requestStatus).toBe('idle');
      });
    });
  });

  describe('cancelRequest - NEW FUNCTIONALITY', () => {
    it('should cancel a pending join request', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      // First set status to pending
      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.requestJoin('room-1');
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('pending');
      });

      // Now cancel the request
      vi.mocked(api.leavePartyRoom).mockImplementation((callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.cancelRequest();
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('idle');
        expect(result.current.room).toBeNull();
        expect(result.current.isConnected).toBe(false);
        expect(toast.info).toHaveBeenCalledWith('Join request cancelled');
      });
    });

    it('should not cancel if status is not pending', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.cancelRequest();
      });

      expect(api.leavePartyRoom).not.toHaveBeenCalled();
    });
  });

  describe('leaveRoom', () => {
    it('should leave a room successfully', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Set up initial room state
      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'content-1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/stream.m3u8',
              title: 'Test Movie',
              hostId: 'user-1',
              createdAt: Date.now(),

              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
            },
          });
        },
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test Movie',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Now leave
      vi.mocked(api.leavePartyRoom).mockImplementation((callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.leaveRoom();
      });

      await waitFor(() => {
        expect(result.current.room).toBeNull();
        expect(result.current.isConnected).toBe(false);
        expect(result.current.requestStatus).toBe('idle');
      });
    });
  });

  describe('member management', () => {
    it('should approve a member join request', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.approveJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.approveMember('member-1');
      });

      await waitFor(() => {
        expect(api.approveJoinRequest).toHaveBeenCalledWith(
          'member-1',
          expect.any(Function),
        );
        expect(toast.success).toHaveBeenCalledWith('Member approved');
      });
    });

    it('should reject a member join request', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.rejectJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.rejectMember('member-1');
      });

      await waitFor(() => {
        expect(api.rejectJoinRequest).toHaveBeenCalledWith(
          'member-1',
          expect.any(Function),
        );
        expect(toast.success).toHaveBeenCalledWith('Request rejected');
      });
    });

    it('should kick a member from the room', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.kickMember).mockImplementation((_memberId, callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.kickUser('member-1');
      });

      await waitFor(() => {
        expect(api.kickMember).toHaveBeenCalledWith(
          'member-1',
          expect.any(Function),
        );
        expect(toast.success).toHaveBeenCalledWith('Member removed');
      });
    });
  });

  describe('event handlers - onPartyJoinApproved with stream token - NEW FUNCTIONALITY', () => {
    it('should fetch fresh stream token when guest joins', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Get the onPartyJoinApproved handler that was registered
      const onPartyJoinApprovedCall = vi.mocked(api.onPartyJoinApproved).mock
        .calls[0];
      const onPartyJoinApprovedHandler = onPartyJoinApprovedCall[0];

      // Mock getPartyStreamToken to return a fresh token
      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({
          success: true,
          token: 'fresh-stream-token-123',
        });
      });

      const mockRoom = {
        id: 'room-1',
        hostId: 'user-1',
        contentId: 'content-1',
        type: 'movie' as const,
        streamUrl: 'https://example.com/stream.m3u8',
        title: 'Test Movie',
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
        createdAt: Date.now(),
      };

      await act(async () => {
        onPartyJoinApprovedHandler({
          room: mockRoom,
          streamToken: 'old-token',
          initialState: {
            currentTime: 100,
            isPlaying: true,
          },
        });
      });

      await waitFor(() => {
        expect(api.getPartyStreamToken).toHaveBeenCalled();
        expect(result.current.room).not.toBeNull();
        expect(result.current.isConnected).toBe(true);
        expect(result.current.requestStatus).toBe('joined');
      });
    });

    it('should fallback to provided token if fresh token fetch fails', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      const onPartyJoinApprovedCall = vi.mocked(api.onPartyJoinApproved).mock
        .calls[0];
      const onPartyJoinApprovedHandler = onPartyJoinApprovedCall[0];

      // Mock getPartyStreamToken to fail
      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({
          success: false,
          error: 'Token fetch failed',
        });
      });

      const mockRoom = {
        id: 'room-1',
        hostId: 'user-1',
        contentId: 'content-1',
        type: 'movie' as const,
        streamUrl: 'https://example.com/stream.m3u8?token={token}',
        title: 'Test Movie',
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
        createdAt: Date.now(),
      };

      await act(async () => {
        onPartyJoinApprovedHandler({
          room: mockRoom,
          streamToken: 'fallback-token',
          initialState: undefined,
        });
      });

      await waitFor(() => {
        expect(result.current.room).not.toBeNull();
        // Should use the fallback token
        expect(result.current.room?.streamUrl).toContain('fallback-token');
      });
    });
  });

  describe('event handlers - onPartyKicked allows re-request - NEW FUNCTIONALITY', () => {
    it('should set status to idle when kicked, allowing re-request', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      // Get the onPartyKicked handler that was registered
      const onPartyKickedCall = vi.mocked(api.onPartyKicked).mock.calls[0];
      const onPartyKickedHandler = onPartyKickedCall[0];

      await act(async () => {
        onPartyKickedHandler({ reason: 'Test kick' });
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('idle'); // Should be idle, not rejected
        expect(result.current.room).toBeNull();
        expect(result.current.isConnected).toBe(false);
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should clear guest token from sessionStorage when kicked', async () => {
      renderHook(() => useWatchParty({}));

      // Set initial guest token
      sessionStorage.setItem('guest_token', 'test-token');

      // Get the onPartyKicked handler
      const onPartyKickedCall = vi.mocked(api.onPartyKicked).mock.calls[0];
      const onPartyKickedHandler = onPartyKickedCall[0];

      await act(async () => {
        onPartyKickedHandler({ reason: 'Test' });
      });

      // Check the token was removed
      await waitFor(() => {
        expect(sessionStorage.getItem('guest_token')).toBeNull();
      });
    });
  });

  describe('event handlers - member safety with null checks', () => {
    it('should handle onPartyMemberJoined with null member data safely', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      // Get the handler
      const onPartyMemberJoinedCall = vi.mocked(api.onPartyMemberJoined).mock
        .calls[0];
      const onPartyMemberJoinedHandler = onPartyMemberJoinedCall[0];

      // Set up initial room state first
      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              hostId: 'user-1',
              contentId: 'content-1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/stream.m3u8',
              title: 'Test',
              members: [
                {
                  id: 'user-1',
                  name: 'Host',
                  isHost: true,
                  joinedAt: Date.now(),
                },
              ],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test Movie',
          type: 'movie',
        });
      });

      // Trigger with undefined member data
      await act(async () => {
        onPartyMemberJoinedHandler({
          member: { id: undefined, name: undefined } as unknown as RoomMember,
        });
      });

      // Should not crash and should show fallback name
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Someone joined the party');
      });
    });

    it('should handle onPartyAdminRequest with null member data safely', async () => {
      renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      const onPartyAdminRequestCall = vi.mocked(api.onPartyAdminRequest).mock
        .calls[0];
      const onPartyAdminRequestHandler = onPartyAdminRequestCall[0];

      await act(async () => {
        onPartyAdminRequestHandler({
          member: undefined as unknown as RoomMember,
        });
      });

      // Should show fallback name instead of crashing
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Someone requested to join');
      });
    });

    it('should filter members with null/undefined IDs safely', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Get the onPartyMemberLeft handler
      const onPartyMemberLeftCall = vi.mocked(api.onPartyMemberLeft).mock
        .calls[0];
      const onPartyMemberLeftHandler = onPartyMemberLeftCall[0];

      // Set up room with members via createRoom
      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              hostId: 'user-1',
              contentId: 'content-1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/stream.m3u8',
              title: 'Test',
              members: [
                {
                  id: 'user-1',
                  name: 'Host',
                  isHost: true,
                  joinedAt: Date.now(),
                },
                {
                  id: 'user-2',
                  name: 'Guest',
                  isHost: false,
                  joinedAt: Date.now(),
                },
              ],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test Movie',
          type: 'movie',
        });
      });

      await act(async () => {
        onPartyMemberLeftHandler({ userId: 'user-2' });
      });

      // Should filter safely without crashing
      await waitFor(() => {
        expect(result.current.room?.members).toHaveLength(1);
        expect(
          result.current.room?.members.some((m) => m?.id === 'user-2'),
        ).toBe(false);
        expect(
          result.current.room?.members.some((m) => m?.id === 'user-1'),
        ).toBe(true);
      });
    });
  });

  describe('chat functionality', () => {
    it('should send a message', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.sendPartyMessage).mockImplementation(
        (_message, callback) => {
          if (callback) callback({ success: true });
        },
      );

      await act(async () => {
        result.current.sendMessage('Hello, party!');
      });

      expect(api.sendPartyMessage).toHaveBeenCalledWith(
        'Hello, party!',
        expect.any(Function),
      );
    });

    it('should receive chat messages', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      const onPartyMessageCall = vi.mocked(api.onPartyMessage).mock.calls[0];
      const onPartyMessageHandler = onPartyMessageCall[0];

      await act(async () => {
        onPartyMessageHandler({
          id: 'msg-1',
          roomId: 'room-1',
          userId: 'user-1',
          userName: 'Test User',
          content: 'Hello!',
          timestamp: Date.now(),
          isSystem: false,
        });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Hello!');
      });
    });

    it('should fetch messages when connected', async () => {
      renderHook(() => useWatchParty({}));

      const mockMessages = [
        {
          id: 'msg-1',
          roomId: 'room-1',
          userId: 'user-1',
          userName: 'User 1',
          content: 'First message',
          timestamp: Date.now(),
          isSystem: false,
        },
        {
          id: 'msg-2',
          roomId: 'room-1',
          userId: 'user-2',
          userName: 'User 2',
          content: 'Second message',
          timestamp: Date.now(),
          isSystem: false,
        },
      ];

      vi.mocked(api.getPartyMessages).mockImplementation((callback) => {
        callback({ success: true, messages: mockMessages });
      });

      // Simulate connection by triggering onPartyJoinApproved
      const onPartyJoinApprovedCall = vi.mocked(api.onPartyJoinApproved).mock
        .calls[0];
      const onPartyJoinApprovedHandler = onPartyJoinApprovedCall[0];

      // Mock getPartyStreamToken
      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({
          success: true,
          token: 'test-token',
        });
      });

      await act(async () => {
        onPartyJoinApprovedHandler({
          room: {
            id: 'room-1',
            hostId: 'user-1',
            contentId: 'content-1',
            type: 'movie' as const,
            streamUrl: 'https://example.com/stream.m3u8',
            title: 'Test',
            members: [],
            pendingMembers: [],
            state: {
              currentTime: 0,
              isPlaying: false,
              lastUpdated: Date.now(),
              playbackRate: 1,
            },
            createdAt: Date.now(),
          },
          streamToken: 'token-123',
          initialState: undefined,
        });
      });

      await waitFor(
        () => {
          expect(api.getPartyMessages).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('sync functionality', () => {
    it('should sync player state', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.syncPartyState).mockImplementation(vi.fn());

      await act(async () => {
        result.current.sync(100, true);
      });

      expect(api.syncPartyState).toHaveBeenCalledWith({
        currentTime: 100,
        isPlaying: true,
      });
    });

    it('should update content', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.updatePartyContent).mockImplementation(
        (_payload, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.updateContent({
          title: 'New Content',
          type: 'movie',
        });
      });

      expect(api.updatePartyContent).toHaveBeenCalledWith(
        {
          title: 'New Content',
          type: 'movie',
        },
        expect.any(Function),
      );
    });
  });
});
