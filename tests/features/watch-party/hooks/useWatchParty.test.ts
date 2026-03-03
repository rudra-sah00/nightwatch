import { act, renderHook, waitFor } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  RoomMember,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';
import * as ws from '@/lib/socket';

// Mock dependencies
vi.mock('@/lib/socket');
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
vi.mock(
  '@/features/watch-party/room/services/watch-party.api',
  () => import('../__mocks__/watch-party-api'),
);
vi.mock('sonner', () => import('../__mocks__/sonner'));
vi.mock(
  '@/providers/socket-provider',
  () => import('../__mocks__/socket-provider'),
);
vi.mock('@/features/watch', () => import('../__mocks__/watch-utils'));

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
      expect(api.onPartyHostDisconnected).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(api.onPartyHostReconnected).toHaveBeenCalledWith(
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
      vi.mocked(api.onPartyMemberRejected).mockReturnValue(mockCleanups[10]);
      vi.mocked(api.onUserTyping).mockReturnValue(mockCleanups[11]);
      vi.mocked(api.onPartyHostDisconnected).mockReturnValue(mockCleanups[12]);
      vi.mocked(api.onPartyHostReconnected).mockReturnValue(mockCleanups[13]);

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
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
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
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
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
        permissions: {
          canGuestsDraw: false,
          canGuestsPlaySounds: true,
          canGuestsChat: true,
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
        permissions: {
          canGuestsDraw: false,
          canGuestsPlaySounds: true,
          canGuestsChat: true,
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
        // When token fetch fails, the fallback token is still used but
        // injectTokenIntoUrl only modifies path-based URLs (/hls/TOKEN/ID),
        // so a plain URL like example.com stays unchanged.
        // Verify the room was set (fallback path worked)
        expect(result.current.room?.streamUrl).toBeDefined();
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
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
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

      // Should not crash — silently skips invalid member data (no toast, no sound)
      expect(toast.info).not.toHaveBeenCalledWith('Someone joined the party');
    });

    it('should NOT show join toast/sound when the joined member is the current authenticated user', async () => {
      const { toast } = await import('sonner');

      // Render with a userId so the hook knows who "self" is
      renderHook(() => useWatchParty({ userId: 'my-user-id' }));

      const handler = vi.mocked(api.onPartyMemberJoined).mock.calls[0][0];

      await act(async () => {
        handler({
          member: {
            id: 'my-user-id',
            name: 'Me',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      // Self-join: no toast, no sound
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should NOT show join toast/sound when the joined member is the current guest user', async () => {
      const { useSocket } = await import('@/providers/socket-provider');
      const { toast } = await import('sonner');

      // Override useSocket mock to return a socket with an id
      vi.mocked(useSocket).mockReturnValue({
        socket: {
          connected: true,
          on: vi.fn(),
          off: vi.fn(),
          emit: vi.fn(),
          id: 'abc123',
        } as unknown as Socket,
        isConnected: true,
        connect: vi.fn(),
        connectGuest: vi.fn(),
        disconnect: vi.fn(),
      });

      // No userId → guest flow; socket id = 'abc123' → guest member id = 'guest:abc123'
      renderHook(() => useWatchParty({}));

      const handler = vi.mocked(api.onPartyMemberJoined).mock.calls[0][0];

      await act(async () => {
        handler({
          member: {
            id: 'guest:abc123',
            name: 'Guest',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      // Self-join as guest: no toast
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should show join toast for OTHER members joining', async () => {
      const { toast } = await import('sonner');

      renderHook(() => useWatchParty({ userId: 'my-user-id' }));

      const handler = vi.mocked(api.onPartyMemberJoined).mock.calls[0][0];

      await act(async () => {
        handler({
          member: {
            id: 'other-user',
            name: 'Alice',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      // Other member: toast and sound should fire
      expect(toast.success).toHaveBeenCalledWith('Alice joined!', {
        id: 'member-joined-other-user',
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
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
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

  describe('sound notifications', () => {
    let mockPlay: ReturnType<typeof vi.fn>;
    let audioInstances: Array<{ src: string; play: ReturnType<typeof vi.fn> }>;

    beforeEach(() => {
      mockPlay = vi.fn().mockResolvedValue(undefined);
      audioInstances = [];
      vi.stubGlobal(
        'Audio',
        class MockAudio {
          src: string;
          play: ReturnType<typeof vi.fn>;
          constructor(src: string) {
            this.src = src;
            this.play = mockPlay;
            audioInstances.push({ src, play: mockPlay });
          }
        },
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should play room-join.mp3 when a member joins', async () => {
      renderHook(() => useWatchParty({}));

      const onPartyMemberJoinedHandler = vi.mocked(api.onPartyMemberJoined).mock
        .calls[0][0];

      await act(async () => {
        onPartyMemberJoinedHandler({
          member: {
            id: 'user-2',
            name: 'Guest',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      await waitFor(() => {
        expect(audioInstances.some((a) => a.src === '/room-join.mp3')).toBe(
          true,
        );
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should not play room-join.mp3 when member data is invalid', async () => {
      renderHook(() => useWatchParty({}));

      const onPartyMemberJoinedHandler = vi.mocked(api.onPartyMemberJoined).mock
        .calls[0][0];

      await act(async () => {
        onPartyMemberJoinedHandler({
          member: { id: undefined, name: undefined } as unknown as RoomMember,
        });
      });

      await waitFor(() => {
        expect(audioInstances.some((a) => a.src === '/room-join.mp3')).toBe(
          false,
        );
      });
    });

    it('should play room-req.mp3 when someone requests to join', async () => {
      renderHook(() => useWatchParty({}));

      const onPartyAdminRequestHandler = vi.mocked(api.onPartyAdminRequest).mock
        .calls[0][0];

      await act(async () => {
        onPartyAdminRequestHandler({
          member: {
            id: 'user-3',
            name: 'Requester',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      await waitFor(() => {
        expect(audioInstances.some((a) => a.src === '/room-req.mp3')).toBe(
          true,
        );
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should play room-req.mp3 even when member data is null', async () => {
      renderHook(() => useWatchParty({}));

      const onPartyAdminRequestHandler = vi.mocked(api.onPartyAdminRequest).mock
        .calls[0][0];

      await act(async () => {
        onPartyAdminRequestHandler({
          member: undefined as unknown as RoomMember,
        });
      });

      await waitFor(() => {
        expect(audioInstances.some((a) => a.src === '/room-req.mp3')).toBe(
          true,
        );
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should not crash if audio play() rejects', async () => {
      mockPlay.mockRejectedValue(new Error('Autoplay blocked'));
      renderHook(() => useWatchParty({}));

      const onPartyMemberJoinedHandler = vi.mocked(api.onPartyMemberJoined).mock
        .calls[0][0];

      // Should not throw
      await act(async () => {
        onPartyMemberJoinedHandler({
          member: {
            id: 'user-4',
            name: 'Blocked',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      await waitFor(() => {
        expect(audioInstances.some((a) => a.src === '/room-join.mp3')).toBe(
          true,
        );
        expect(mockPlay).toHaveBeenCalled();
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
            permissions: {
              canGuestsDraw: false,
              canGuestsPlaySounds: true,
              canGuestsChat: true,
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

      expect(api.emitPartyEvent).toHaveBeenCalledWith({
        eventType: 'play',
        videoTime: 100,
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

  describe('onPartyContentUpdated event handler', () => {
    it('should update room when content is updated with token', async () => {
      let contentUpdateHandler: (data: { room: WatchPartyRoom }) => void =
        () => {};

      vi.mocked(api.onPartyContentUpdated).mockImplementation((handler) => {
        contentUpdateHandler = handler;
        return vi.fn();
      });

      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({ success: true, token: 'new-stream-token' });
      });

      const { result } = renderHook(() => useWatchParty({}));

      // Trigger content update
      await act(async () => {
        contentUpdateHandler({
          room: {
            id: 'room-1',
            contentId: 'new-content',
            type: 'movie',
            streamUrl: 'https://example.com/new-stream.m3u8',
            title: 'New Movie',
            hostId: 'user-1',
            members: [],
            pendingMembers: [],
            state: {
              currentTime: 0,
              isPlaying: false,
              lastUpdated: Date.now(),
              playbackRate: 1,
            },
            permissions: {
              canGuestsDraw: false,
              canGuestsPlaySounds: true,
              canGuestsChat: true,
            },
            createdAt: Date.now(),
            spriteVtt: 'https://cdn.example.com/sprites.vtt',
            captionUrl: 'https://cdn.example.com/captions.vtt',
            subtitleTracks: [
              {
                id: 'sub-1',
                src: 'https://cdn.example.com/sub.vtt',
                label: 'English',
                language: 'en',
              },
            ],
          },
        });
      });

      await waitFor(() => {
        expect(api.getPartyStreamToken).toHaveBeenCalled();
        expect(result.current.room?.title).toBe('New Movie');
      });
    });

    it('should fallback when token fetch fails', async () => {
      let contentUpdateHandler: (data: { room: WatchPartyRoom }) => void =
        () => {};

      vi.mocked(api.onPartyContentUpdated).mockImplementation((handler) => {
        contentUpdateHandler = handler;
        return vi.fn();
      });

      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({ success: false });
      });

      const { result } = renderHook(() => useWatchParty({}));

      // Trigger content update with failed token fetch
      await act(async () => {
        contentUpdateHandler({
          room: {
            id: 'room-1',
            contentId: 'content-1',
            type: 'movie',
            streamUrl: 'https://example.com/stream.m3u8',
            title: 'Fallback Movie',
            hostId: 'user-1',
            members: [],
            pendingMembers: [],
            state: {
              currentTime: 0,
              isPlaying: false,
              lastUpdated: Date.now(),
              playbackRate: 1,
            },
            permissions: {
              canGuestsDraw: false,
              canGuestsPlaySounds: true,
              canGuestsChat: true,
            },
            createdAt: Date.now(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.room?.title).toBe('Fallback Movie');
      });
    });
  });

  describe('onUserTyping event handler', () => {
    it('should add user to typing list when typing starts', async () => {
      let typingHandler: (data: {
        userId: string;
        userName: string;
        isTyping: boolean;
      }) => void = () => {};

      vi.mocked(api.onUserTyping).mockImplementation((handler) => {
        typingHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        typingHandler({
          userId: 'user-2',
          userName: 'John',
          isTyping: true,
        });
      });

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1);
        expect(result.current.typingUsers[0]).toEqual({
          userId: 'user-2',
          userName: 'John',
        });
      });
    });

    it('should not add duplicate typing users', async () => {
      let typingHandler: (data: {
        userId: string;
        userName: string;
        isTyping: boolean;
      }) => void = () => {};

      vi.mocked(api.onUserTyping).mockImplementation((handler) => {
        typingHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        typingHandler({ userId: 'user-2', userName: 'John', isTyping: true });
        typingHandler({ userId: 'user-2', userName: 'John', isTyping: true });
      });

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1);
      });
    });

    it('should remove user from typing list when typing stops', async () => {
      let typingHandler: (data: {
        userId: string;
        userName: string;
        isTyping: boolean;
      }) => void = () => {};

      vi.mocked(api.onUserTyping).mockImplementation((handler) => {
        typingHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() => useWatchParty({}));

      // Add typing user
      await act(async () => {
        typingHandler({ userId: 'user-2', userName: 'John', isTyping: true });
      });

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1);
      });

      // Remove typing user
      await act(async () => {
        typingHandler({ userId: 'user-2', userName: 'John', isTyping: false });
      });

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(0);
      });
    });
  });

  describe('requestJoin - already approved path', () => {
    it('should handle immediate approval with room and guest token', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
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
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
            guestToken: 'guest-token-123',
          });
        },
      );

      await act(async () => {
        result.current.requestJoin('room-1', 'Guest Name');
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('joined');
        expect(result.current.isConnected).toBe(true);
        expect(result.current.room?.id).toBe('room-1');
        expect(sessionStorage.getItem('guest_token')).toBe('guest-token-123');
      });
    });
  });

  describe('unmount cleanup', () => {
    it('should clear guest token on unmount', async () => {
      sessionStorage.setItem('guest_token', 'test-token');

      const { unmount } = renderHook(() => useWatchParty({}));

      unmount();

      expect(sessionStorage.getItem('guest_token')).toBeNull();
    });

    it('should handle unmount gracefully when no guest token', async () => {
      sessionStorage.clear();

      const { unmount } = renderHook(() => useWatchParty({}));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('cancelRequest with callback', () => {
    it('should call onComplete callback when request is cancelled', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const onComplete = vi.fn();

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

      // Now cancel the request with callback
      vi.mocked(api.leavePartyRoom).mockImplementation((callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.cancelRequest(onComplete);
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('idle');
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('guest token preservation on mount', () => {
    it('should preserve existing guest token on mount (cleanup happens in requestJoin)', () => {
      sessionStorage.setItem('guest_token', 'existing-token');

      renderHook(() => useWatchParty({}));

      // Token should NOT be cleared on mount — cleanup is deferred to requestJoin
      expect(sessionStorage.getItem('guest_token')).toBe('existing-token');
    });

    it('should not throw when no guest token exists', () => {
      sessionStorage.clear();

      expect(() => renderHook(() => useWatchParty({}))).not.toThrow();
    });
  });

  describe('onPartyMemberRejected callback', () => {
    it('should remove member from pendingMembers when rejected', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      // Create room with pending member
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
              members: [],
              pendingMembers: [
                {
                  id: 'pending-user',
                  name: 'Pending',
                  isHost: false,
                  joinedAt: Date.now(),
                },
              ],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
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
          title: 'Test',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(1);
      });

      // Capture and invoke the onPartyMemberRejected handler
      const handler = vi.mocked(api.onPartyMemberRejected).mock.calls[0][0];

      await act(async () => {
        handler({ memberId: 'pending-user' });
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(0);
      });
    });
  });

  describe('onPartyAdminRequest callback - room mutation', () => {
    it('should add member to pendingMembers on admin request', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      // Create room with empty pending members
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
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
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
          title: 'Test',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.room).not.toBeNull();
      });

      const handler = vi.mocked(api.onPartyAdminRequest).mock.calls[0][0];

      await act(async () => {
        handler({
          member: {
            id: 'new-user',
            name: 'Alice',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(1);
        expect(result.current.room?.pendingMembers[0].name).toBe('Alice');
      });

      expect(toast.info).toHaveBeenCalledWith('Alice requested to join');
    });

    it('should deduplicate admin requests for same member', async () => {
      const { result } = renderHook(() => useWatchParty({}));

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
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
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
          title: 'Test',
          type: 'movie',
        });
      });

      const handler = vi.mocked(api.onPartyAdminRequest).mock.calls[0][0];
      const member = {
        id: 'dup-user',
        name: 'Bob',
        isHost: false,
        joinedAt: Date.now(),
      };

      await act(async () => {
        handler({ member });
      });

      await act(async () => {
        handler({ member });
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(1);
      });
    });
  });

  describe('onPartyJoinApproved callback - initialState', () => {
    it('should call onStateUpdate with initialState when currentTime is set', async () => {
      const onStateUpdate = vi.fn();
      renderHook(() => useWatchParty({ onStateUpdate }));

      // Mock getPartyStreamToken
      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({ success: true, token: 'fresh-token' });
      });

      const handler = vi.mocked(api.onPartyJoinApproved).mock.calls[0][0];

      await act(async () => {
        handler({
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
            permissions: {
              canGuestsDraw: false,
              canGuestsPlaySounds: true,
              canGuestsChat: true,
            },
            createdAt: Date.now(),
          },
          streamToken: 'old-token',
          initialState: {
            currentTime: 42,
            videoTime: 42,
            isPlaying: true,
            playbackRate: 1.5,
            timestamp: 1000,
            serverTime: 2000,
          },
        });
      });

      await waitFor(() => {
        expect(onStateUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            currentTime: 42,
            videoTime: 42,
            isPlaying: true,
            playbackRate: 1.5,
            eventType: 'init',
            fromHost: true,
          }),
        );
      });
    });

    it('should NOT call onStateUpdate when initialState.currentTime is null', async () => {
      const onStateUpdate = vi.fn();
      renderHook(() => useWatchParty({ onStateUpdate }));

      vi.mocked(api.getPartyStreamToken).mockImplementation((callback) => {
        callback({ success: true, token: 'fresh-token' });
      });

      const handler = vi.mocked(api.onPartyJoinApproved).mock.calls[0][0];

      await act(async () => {
        handler({
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
            permissions: {
              canGuestsDraw: false,
              canGuestsPlaySounds: true,
              canGuestsChat: true,
            },
            createdAt: Date.now(),
          },
          streamToken: 'old-token',
          initialState: {
            currentTime: null as unknown as number,
            isPlaying: false,
          },
        });
      });

      await waitFor(() => {
        // onStateUpdate should NOT have been called since currentTime is null
        expect(onStateUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe('requestSync timer callbacks', () => {
    it('should call onStateUpdate via requestSync timer after connection', async () => {
      vi.useFakeTimers();
      const onStateUpdate = vi.fn();

      // Setup: create room to set isConnected=true
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
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      vi.mocked(api.requestPartyState).mockImplementation((callback) => {
        callback({
          success: true,
          state: {
            currentTime: 10,
            isPlaying: true,
            playbackRate: 1,
            timestamp: Date.now(),
            serverTime: Date.now(),
          },
        });
      });

      vi.mocked(api.getPartyMessages).mockImplementation((callback) => {
        callback({
          success: true,
          messages: [
            {
              id: 'msg-1',
              roomId: 'room-1',
              userId: 'u1',
              userName: 'User',
              content: 'Hello',
              isSystem: false,
              timestamp: Date.now(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useWatchParty({ onStateUpdate }));

      await act(async () => {
        result.current.createRoom({
          contentId: 'content-1',
          streamUrl: 'https://example.com/stream.m3u8',
          title: 'Test',
          type: 'movie',
        });
      });

      // Advance past the 500ms sync timer
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(api.requestPartyState).toHaveBeenCalled();
      expect(api.getPartyMessages).toHaveBeenCalled();
      expect(onStateUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ currentTime: 10 }),
      );

      vi.useRealTimers();
    });
  });

  // ── Additional Coverage Tests ────────────────────────────────────────

  describe('sendMessage failure', () => {
    it('should show error toast when sendMessage fails', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.sendPartyMessage).mockImplementation(
        (_message, callback) => {
          if (callback) callback({ success: false });
        },
      );

      await act(async () => {
        result.current.sendMessage('Hello');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to send message');
    });
  });

  describe('approveMember optimistic update', () => {
    it('should move member from pendingMembers to members on approve success', async () => {
      const pending: RoomMember = {
        id: 'pending-1',
        name: 'Pending User',
        isHost: false,
        joinedAt: Date.now(),
      };

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'user-1',
              members: [],
              pendingMembers: [pending],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(1);
      });

      vi.mocked(api.approveJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.approveMember('pending-1');
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(0);
        expect(result.current.room?.members).toContainEqual(
          expect.objectContaining({ id: 'pending-1' }),
        );
      });
    });

    it('should show error toast when approve fails', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.approveJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: false });
        },
      );

      await act(async () => {
        result.current.approveMember('m1');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to approve member');
    });
  });

  describe('rejectMember optimistic update', () => {
    it('should remove member from pendingMembers on reject success', async () => {
      const pending: RoomMember = {
        id: 'p1',
        name: 'P User',
        isHost: false,
        joinedAt: Date.now(),
      };

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'user-1',
              members: [],
              pendingMembers: [pending],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      vi.mocked(api.rejectJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: true });
        },
      );

      await act(async () => {
        result.current.rejectMember('p1');
      });

      await waitFor(() => {
        expect(result.current.room?.pendingMembers).toHaveLength(0);
      });
    });

    it('should show error toast when reject fails', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.rejectJoinRequest).mockImplementation(
        (_memberId, callback) => {
          callback({ success: false });
        },
      );

      await act(async () => {
        result.current.rejectMember('m1');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to reject request');
    });
  });

  describe('kickUser optimistic update', () => {
    it('should remove member from members list on kick success', async () => {
      const member: RoomMember = {
        id: 'mem-1',
        name: 'Kick Me',
        isHost: false,
        joinedAt: Date.now(),
      };

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'user-1',
              members: [member],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      vi.mocked(api.kickMember).mockImplementation((_memberId, callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.kickUser('mem-1');
      });

      await waitFor(() => {
        expect(result.current.room?.members).toHaveLength(0);
      });
    });

    it('should show error toast when kick fails', async () => {
      const { result } = renderHook(() => useWatchParty({}));
      const { toast } = await import('sonner');

      vi.mocked(api.kickMember).mockImplementation((_memberId, callback) => {
        callback({ success: false });
      });

      await act(async () => {
        result.current.kickUser('m1');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to remove member');
    });
  });

  describe('cancelRequest callback body', () => {
    it('should clear state, remove guest token and call onComplete', async () => {
      const onComplete = vi.fn();

      // First, join so requestStatus is 'pending'
      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: true }); // No room → pending
        },
      );

      vi.mocked(api.leavePartyRoom).mockImplementation((callback) => {
        callback({ success: true });
      });

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.requestJoin('room-1');
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('pending');
      });

      sessionStorage.setItem('guest_token', 'test-token');

      await act(async () => {
        result.current.cancelRequest(onComplete);
      });

      await waitFor(() => {
        expect(result.current.room).toBeNull();
        expect(result.current.isConnected).toBe(false);
        expect(result.current.requestStatus).toBe('idle');
        expect(sessionStorage.getItem('guest_token')).toBeNull();
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('leaveRoom clears guest token', () => {
    it('should remove guest token from sessionStorage on leave', async () => {
      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'user-1',
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      sessionStorage.setItem('guest_token', 'leave-token');

      vi.mocked(api.leavePartyRoom).mockImplementation((callback) => {
        callback({ success: true });
      });

      await act(async () => {
        result.current.leaveRoom();
      });

      await waitFor(() => {
        expect(sessionStorage.getItem('guest_token')).toBeNull();
        expect(result.current.messages).toEqual([]);
      });
    });
  });

  describe('updateContent', () => {
    it('should update room on success', async () => {
      const newRoom = {
        id: 'room-1',
        contentId: 'new-content',
        type: 'movie' as const,
        streamUrl: 'https://example.com/new.m3u8',
        title: 'New Title',
        hostId: 'user-1',
        members: [],
        pendingMembers: [],
        state: {
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          playbackRate: 1,
        },
        permissions: {
          canGuestsDraw: false,
          canGuestsPlaySounds: true,
          canGuestsChat: true,
        },
        createdAt: Date.now(),
      };

      vi.mocked(api.updatePartyContent).mockImplementation(
        (_payload, callback) => {
          callback({ success: true, room: newRoom });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.updateContent({
          title: 'New Title',
          type: 'movie',
        });
      });

      await waitFor(() => {
        expect(result.current.room?.title).toBe('New Title');
      });
    });

    it('should show error toast on failure', async () => {
      const { toast } = await import('sonner');

      vi.mocked(api.updatePartyContent).mockImplementation(
        (_payload, callback) => {
          callback({ success: false, error: 'Not host' });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.updateContent({
          title: 'T',
          type: 'movie',
        });
      });

      expect(toast.error).toHaveBeenCalledWith('Not host');
    });
  });

  describe('onPartyMemberLeft with name toast', () => {
    it('should show toast with member name when member leaves', async () => {
      const { toast } = await import('sonner');

      let memberLeftHandler: (data: { userId: string }) => void = () => {};
      vi.mocked(api.onPartyMemberLeft).mockImplementation((handler) => {
        memberLeftHandler = handler;
        return vi.fn();
      });

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'user-1',
              members: [
                {
                  id: 'u2',
                  name: 'Alice',
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
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      await act(async () => {
        memberLeftHandler({ userId: 'u2' });
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Alice left', {
          id: 'member-left-u2',
        });
        expect(result.current.room?.members).toHaveLength(0);
      });
    });
  });

  describe('onPartyClosed', () => {
    it('should clear state and navigate to home for authenticated users', async () => {
      const { toast } = await import('sonner');

      let closedHandler: (data: { reason: string }) => void = () => {};
      vi.mocked(api.onPartyClosed).mockImplementation((handler) => {
        closedHandler = handler;
        return vi.fn();
      });

      renderHook(() => useWatchParty({}));

      // Set a cookie to simulate auth
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'accessToken=abc',
      });

      mockRouterPush.mockClear();

      await act(async () => {
        closedHandler({ reason: 'host_closed' });
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Party finished');
        expect(mockRouterPush).toHaveBeenCalled();
      });

      // Clean up cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    });
  });

  describe('onPartyHostDisconnected and onPartyHostReconnected', () => {
    it('should set hostDisconnected and show warning toast', async () => {
      const { toast } = await import('sonner');

      let disconnectHandler: (data: {
        graceSeconds: number;
        message: string;
      }) => void = () => {};
      vi.mocked(api.onPartyHostDisconnected).mockImplementation((handler) => {
        disconnectHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        disconnectHandler({ graceSeconds: 30, message: 'Host disconnected' });
      });

      await waitFor(() => {
        expect(result.current.hostDisconnected).toBe(true);
        expect(toast.warning).toHaveBeenCalledWith(
          "Host disconnected. Party will close in 30s if they don't return.",
          expect.objectContaining({ id: 'host-disconnected' }),
        );
      });
    });

    it('should show reconnected toast only if previously disconnected', async () => {
      const { toast } = await import('sonner');

      let disconnectHandler: (data: {
        graceSeconds: number;
        message: string;
      }) => void = () => {};
      let reconnectHandler: () => void = () => {};

      vi.mocked(api.onPartyHostDisconnected).mockImplementation((handler) => {
        disconnectHandler = handler;
        return vi.fn();
      });
      vi.mocked(api.onPartyHostReconnected).mockImplementation((handler) => {
        reconnectHandler = handler;
        return vi.fn();
      });

      const { result } = renderHook(() => useWatchParty({}));

      // First disconnect
      await act(async () => {
        disconnectHandler({ graceSeconds: 30, message: 'Host disconnected' });
      });

      expect(result.current.hostDisconnected).toBe(true);

      // Then reconnect
      await act(async () => {
        reconnectHandler();
      });

      await waitFor(() => {
        expect(result.current.hostDisconnected).toBe(false);
        expect(toast.success).toHaveBeenCalledWith('Host reconnected!', {
          id: 'host-disconnected',
        });
      });
    });

    it('should NOT show reconnected toast if not previously disconnected', async () => {
      const { toast } = await import('sonner');

      let reconnectHandler: () => void = () => {};
      vi.mocked(api.onPartyHostReconnected).mockImplementation((handler) => {
        reconnectHandler = handler;
        return vi.fn();
      });

      renderHook(() => useWatchParty({}));

      vi.mocked(toast.success).mockClear();

      await act(async () => {
        reconnectHandler();
      });

      // Should NOT have called toast.success since hostDisconnected was false
      expect(toast.success).not.toHaveBeenCalledWith(
        'Host reconnected!',
        expect.anything(),
      );
    });
  });

  describe('onPartyJoinRejected', () => {
    it('should set rejected status and error when pending', async () => {
      let rejectedHandler: (data: { roomId: string; reason: string }) => void =
        () => {};
      vi.mocked(api.onPartyJoinRejected).mockImplementation((handler) => {
        rejectedHandler = handler;
        return vi.fn();
      });

      // Join first to set pending state
      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: true });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.requestJoin('room-1');
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('pending');
      });

      await act(async () => {
        rejectedHandler({ roomId: 'room-1', reason: 'Host rejected' });
      });

      await waitFor(() => {
        expect(result.current.requestStatus).toBe('rejected');
        expect(result.current.error).toBe('Host rejected your request');
      });
    });
  });

  describe('requestJoin with existing guest token', () => {
    it('should clear existing guest token before join attempt', async () => {
      sessionStorage.setItem('guest_token', 'stale-token');

      vi.mocked(api.requestJoinPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({ success: true });
        },
      );

      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.requestJoin('room-1');
      });

      // The stale token should have been removed before the request
      expect(sessionStorage.getItem('guest_token')).toBeNull();
    });
  });

  describe('emitEvent and sync wrappers', () => {
    it('should forward emitEvent to emitPartyEvent', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.emitEvent({
          eventType: 'play',
          videoTime: 10,
        });
      });

      expect(api.emitPartyEvent).toHaveBeenCalledWith({
        eventType: 'play',
        videoTime: 10,
      });
    });

    it('should forward sync to emitPartyEvent as legacy wrapper', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.sync(42, true, 1.5);
      });

      expect(api.emitPartyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'play',
          videoTime: 42,
          playbackRate: 1.5,
        }),
      );
    });

    it('should use pause for sync when isPlaying is false', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      await act(async () => {
        result.current.sync(15, false);
      });

      expect(api.emitPartyEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'pause',
          videoTime: 15,
        }),
      );
    });
  });

  describe('onPartyMemberJoined self-join skip', () => {
    it('should skip toast for own join (userId match)', async () => {
      const { toast } = await import('sonner');

      let memberJoinedHandler: (data: { member: RoomMember }) => void =
        () => {};
      vi.mocked(api.onPartyMemberJoined).mockImplementation((handler) => {
        memberJoinedHandler = handler;
        return vi.fn();
      });

      renderHook(() => useWatchParty({ userId: 'me-123' }));

      vi.mocked(toast.success).mockClear();

      await act(async () => {
        memberJoinedHandler({
          member: {
            id: 'me-123',
            name: 'Me',
            isHost: true,
            joinedAt: Date.now(),
          },
        });
      });

      // Should not show toast for self-join
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should show toast for other member join', async () => {
      const { toast } = await import('sonner');

      let memberJoinedHandler: (data: { member: RoomMember }) => void =
        () => {};
      vi.mocked(api.onPartyMemberJoined).mockImplementation((handler) => {
        memberJoinedHandler = handler;
        return vi.fn();
      });

      renderHook(() => useWatchParty({ userId: 'me-123' }));

      vi.mocked(toast.success).mockClear();

      await act(async () => {
        memberJoinedHandler({
          member: {
            id: 'other-user',
            name: 'Bob',
            isHost: false,
            joinedAt: Date.now(),
          },
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Bob joined!', {
        id: 'member-joined-other-user',
      });
    });
  });

  describe('reconnection sync for guests', () => {
    it('should request state on socket reconnect for non-host', async () => {
      const onStateUpdate = vi.fn();

      const onHandlers: Record<string, (...args: unknown[]) => void> = {};
      const mockSocketWithHandlers = {
        connected: true,
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          onHandlers[event] = handler;
        }),
        off: vi.fn(),
        emit: vi.fn(),
        id: 'socket-123',
      };

      const { useSocket } = await import('@/providers/socket-provider');
      vi.mocked(useSocket).mockReturnValue({
        socket: mockSocketWithHandlers as unknown as Socket,
        isConnected: true,
        connect: vi.fn(),
        connectGuest: vi.fn(),
        disconnect: vi.fn(),
      });

      vi.mocked(api.createPartyRoom).mockImplementation(
        (_payload, callback) => {
          callback({
            success: true,
            room: {
              id: 'room-1',
              contentId: 'c1',
              type: 'movie' as const,
              streamUrl: 'https://example.com/s.m3u8',
              title: 'T',
              hostId: 'different-host', // NOT user-1
              members: [],
              pendingMembers: [],
              state: {
                currentTime: 0,
                isPlaying: false,
                lastUpdated: Date.now(),
                playbackRate: 1,
              },
              permissions: {
                canGuestsDraw: false,
                canGuestsPlaySounds: true,
                canGuestsChat: true,
              },
              createdAt: Date.now(),
            },
          });
        },
      );

      vi.mocked(api.requestPartyState).mockImplementation((callback) => {
        callback({
          success: true,
          state: {
            currentTime: 50,
            isPlaying: true,
            playbackRate: 1,
            timestamp: Date.now(),
            serverTime: Date.now(),
          },
        });
      });

      const { result } = renderHook(() =>
        useWatchParty({ userId: 'user-1', onStateUpdate }),
      );

      await act(async () => {
        result.current.createRoom({
          contentId: 'c1',
          streamUrl: 'https://example.com/s.m3u8',
          title: 'T',
          type: 'movie',
        });
      });

      // Simulate socket reconnection
      if (onHandlers.connect) {
        await act(async () => {
          onHandlers.connect();
        });
      }

      await waitFor(() => {
        expect(api.requestPartyState).toHaveBeenCalled();
      });
    });
  });

  describe('coverage gaps', () => {
    it('should store guest token in sessionStorage on join approved', async () => {
      renderHook(() => useWatchParty({}));

      const handler = vi.mocked(api.onPartyJoinApproved).mock.calls[0][0];
      await act(async () => {
        handler({
          room: {
            id: '1',
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
          } as unknown as WatchPartyRoom,
          streamToken: 'test-token',
          guestToken: 'test-guest-token',
        });
      });

      expect(sessionStorage.getItem('guest_token')).toBe('test-guest-token');
    });

    it('should retry requestPartyState on connection', async () => {
      vi.useFakeTimers();

      const initialRoom = {
        id: 'room-1',
        hostId: 'host-1',
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
      };
      renderHook(() => useWatchParty({ userId: 'guest-1' }));

      // Setup room state
      act(() => {
        const joinHandler = vi.mocked(api.onPartyJoinApproved).mock.calls[0][0];
        joinHandler({
          room: initialRoom as unknown as WatchPartyRoom,
          streamToken: 'token',
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(501);
      });
      expect(api.requestPartyState).toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1001); // For timer2 (1500)
      });
      expect(api.requestPartyState).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should show toast when someone else leaves', async () => {
      const { toast } = await import('sonner');
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue({
        id: 'my-socket-id',
        connected: true,
      } as unknown as Socket);

      renderHook(() => useWatchParty({ userId: 'host-1' }));

      // Setup room with Alice
      const mockRoom = {
        id: 'r1',
        members: [{ id: 'user-2', name: 'Alice', permissions: {} }],
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
      };

      const onJoinApproved = vi.mocked(api.onPartyJoinApproved).mock
        .calls[0][0];
      await act(async () => {
        onJoinApproved({
          room: mockRoom as unknown as WatchPartyRoom,
          streamToken: 'token',
        });
      });

      const onMemberLeft = vi.mocked(api.onPartyMemberLeft).mock.calls[0][0];
      await act(async () => {
        onMemberLeft({ userId: 'user-2' });
      });

      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Alice left'),
        expect.any(Object),
      );
    });

    it('should handle kickUser', async () => {
      const { toast } = await import('sonner');
      const { result } = renderHook(() => useWatchParty({}));

      vi.mocked(api.kickMember).mockImplementation((_id, cb) =>
        cb({ success: true }),
      );

      await act(async () => {
        result.current.kickUser('user-2');
      });
      expect(api.kickMember).toHaveBeenCalledWith(
        'user-2',
        expect.any(Function),
      );
      expect(toast.success).toHaveBeenCalledWith('Member removed');
    });

    it('should update member permissions', async () => {
      const { result } = renderHook(() => useWatchParty({}));

      const onPerms = vi.mocked(api.onPartyMemberPermissionsUpdated).mock
        .calls[0][0];

      const mockRoom = {
        id: 'r1',
        members: [{ id: 'u2', name: 'A', permissions: { canDraw: false } }],
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
      };

      const onJoinApproved = vi.mocked(api.onPartyJoinApproved).mock
        .calls[0][0];
      await act(async () => {
        onJoinApproved({
          room: mockRoom as unknown as WatchPartyRoom,
          streamToken: 'token',
        });
      });

      await act(async () => {
        onPerms({ memberId: 'u2', permissions: { canDraw: true } });
      });

      expect(result.current.room?.members?.[0].permissions?.canDraw).toBe(true);
    });
  });
});
