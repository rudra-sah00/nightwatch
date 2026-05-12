import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as friendsApi from '@/features/friends/api';

vi.mock('@/features/friends/api', () => ({
  getFriends: vi.fn(),
  getPendingRequests: vi.fn(),
  getSentRequests: vi.fn(),
  getBlockedUsers: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  unblockUser: vi.fn(),
  invalidateFriendsCache: vi.fn(),
}));

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({ socket: mockSocket, isConnected: true }),
}));

import { useFriends } from '@/features/friends/hooks/use-friends';

describe('useFriends', () => {
  const mockFriends = [
    {
      id: 'f1',
      name: 'Alice',
      username: 'alice',
      profilePhoto: null,
      isOnline: true,
      activity: null,
    },
    {
      id: 'f2',
      name: 'Bob',
      username: 'bob',
      profilePhoto: null,
      isOnline: false,
      activity: null,
    },
  ];
  const mockPending = [
    {
      id: 'r1',
      senderId: 's2',
      createdAt: '2026-01-01',
      name: 'Carol',
      username: 'carol',
      profilePhoto: null,
    },
  ];
  const mockSent = [
    {
      id: 'r2',
      receiverId: 'r1',
      createdAt: '2026-01-01',
      name: 'Dave',
      username: 'dave',
      profilePhoto: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(friendsApi.getFriends).mockResolvedValue(mockFriends);
    vi.mocked(friendsApi.getPendingRequests).mockResolvedValue(mockPending);
    vi.mocked(friendsApi.getSentRequests).mockResolvedValue(mockSent);
    vi.mocked(friendsApi.getBlockedUsers).mockResolvedValue([]);
  });

  it('fetches friends, pending, and sent requests on mount', async () => {
    const { result } = renderHook(() => useFriends());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.friends).toEqual(mockFriends);
    expect(result.current.pendingRequests).toEqual(mockPending);
    expect(result.current.sentRequests).toEqual(mockSent);
    expect(friendsApi.getFriends).toHaveBeenCalledTimes(1);
    expect(friendsApi.getPendingRequests).toHaveBeenCalledTimes(1);
    expect(friendsApi.getSentRequests).toHaveBeenCalledTimes(1);
  });

  it('separates online and offline friends', async () => {
    const { result } = renderHook(() => useFriends());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.onlineFriends).toEqual([mockFriends[0]]);
    expect(result.current.offlineFriends).toEqual([mockFriends[1]]);
  });

  it('handles fetch error gracefully', async () => {
    vi.mocked(friendsApi.getFriends).mockRejectedValue(new Error('Network'));

    const { result } = renderHook(() => useFriends());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.friends).toEqual([]);
  });

  it('accept calls API and refetches', async () => {
    vi.mocked(friendsApi.acceptFriendRequest).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.accept('r1');
    });

    expect(friendsApi.acceptFriendRequest).toHaveBeenCalledWith('r1');
    expect(friendsApi.invalidateFriendsCache).toHaveBeenCalled();
    // Refetched (called twice: initial + after accept)
    expect(friendsApi.getFriends).toHaveBeenCalledTimes(2);
  });

  it('reject calls API and refetches', async () => {
    vi.mocked(friendsApi.rejectFriendRequest).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reject('r1');
    });

    expect(friendsApi.rejectFriendRequest).toHaveBeenCalledWith('r1');
    expect(friendsApi.invalidateFriendsCache).toHaveBeenCalled();
  });

  it('cancel calls API and refetches', async () => {
    vi.mocked(friendsApi.cancelFriendRequest).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.cancel('r2');
    });

    expect(friendsApi.cancelFriendRequest).toHaveBeenCalledWith('r2');
    expect(friendsApi.invalidateFriendsCache).toHaveBeenCalled();
  });

  it('registers socket event listeners', async () => {
    renderHook(() => useFriends());

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith(
        'friend:status',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'friend:activity',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'friend:request_received',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'friend:request_accepted',
        expect.any(Function),
      );
    });
  });

  it('updates online status via socket event', async () => {
    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Get the status handler
    const statusCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'friend:status');
    const statusHandler = statusCall?.[1] as (data: {
      userId: string;
      isOnline: boolean;
    }) => void;

    act(() => {
      statusHandler({ userId: 'f2', isOnline: true });
    });

    expect(result.current.friends.find((f) => f.id === 'f2')?.isOnline).toBe(
      true,
    );
    expect(result.current.onlineFriends).toHaveLength(2);
  });

  it('updates activity via socket event', async () => {
    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const activityCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'friend:activity');
    const activityHandler = activityCall?.[1] as (data: {
      userId: string;
      activity: {
        type: string;
        title: string;
        season: number | null;
        episode: number | null;
        episodeTitle: string | null;
      } | null;
    }) => void;

    act(() => {
      activityHandler({
        userId: 'f1',
        activity: {
          type: 'movie',
          title: 'Inception',
          season: null,
          episode: null,
          episodeTitle: null,
        },
      });
    });

    expect(result.current.friends.find((f) => f.id === 'f1')?.activity).toEqual(
      {
        type: 'movie',
        title: 'Inception',
        season: null,
        episode: null,
        episodeTitle: null,
      },
    );
  });

  it('clears activity via socket event', async () => {
    const { result } = renderHook(() => useFriends());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const activityCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'friend:activity');
    const activityHandler = activityCall?.[1] as (data: {
      userId: string;
      activity: null;
    }) => void;

    act(() => {
      activityHandler({ userId: 'f1', activity: null });
    });

    expect(
      result.current.friends.find((f) => f.id === 'f1')?.activity,
    ).toBeNull();
  });

  it('cleans up socket listeners on unmount', async () => {
    const { unmount } = renderHook(() => useFriends());
    await waitFor(() => expect(mockSocket.on).toHaveBeenCalled());

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith(
      'friend:status',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'friend:activity',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'friend:request_received',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'friend:request_accepted',
      expect.any(Function),
    );
  });
});
