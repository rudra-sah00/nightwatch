import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as friendsApi from '@/features/friends/api';

vi.mock('@/features/friends/api', () => ({
  getConversations: vi.fn(),
  getFriends: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  invalidateFriendsCache: vi.fn(),
}));

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({ socket: mockSocket, isConnected: true }),
}));

import {
  useConversations,
  useMessageThread,
} from '@/features/friends/hooks/use-messages';

describe('useConversations', () => {
  const mockConvos = [
    {
      friendId: 'f1',
      name: 'Alice',
      lastMessage: 'hi',
      unreadCount: 2,
      isOnline: true,
    },
  ];
  const mockFriends = [
    {
      id: 'f1',
      name: 'Alice',
      username: 'alice',
      profilePhoto: null,
      isOnline: true,
    },
    {
      id: 'f2',
      name: 'Bob',
      username: 'bob',
      profilePhoto: null,
      isOnline: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(friendsApi.getConversations).mockResolvedValue(
      mockConvos as never,
    );
    vi.mocked(friendsApi.getFriends).mockResolvedValue(mockFriends);
  });

  it('fetches conversations and friends on mount', async () => {
    const { result } = renderHook(() => useConversations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should merge: f1 from convos + f2 from friends (no messages)
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].friendId).toBe('f1');
    expect(result.current.conversations[1].friendId).toBe('f2');
  });

  it('handles fetch error gracefully', async () => {
    vi.mocked(friendsApi.getConversations).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useConversations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.conversations).toEqual([]);
  });

  it('registers socket listeners for real-time updates', async () => {
    renderHook(() => useConversations());

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message:new',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'friend:status',
        expect.any(Function),
      );
    });
  });

  it('updates online status via socket', async () => {
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const statusCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'friend:status');
    const handler = statusCall?.[1] as (data: {
      userId: string;
      isOnline: boolean;
    }) => void;

    act(() => {
      handler({ userId: 'f1', isOnline: false });
    });

    expect(
      result.current.conversations.find((c) => c.friendId === 'f1')?.isOnline,
    ).toBe(false);
  });

  it('cleans up socket listeners on unmount', async () => {
    const { unmount } = renderHook(() => useConversations());
    await waitFor(() => expect(mockSocket.on).toHaveBeenCalled());

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith(
      'message:new',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'friend:status',
      expect.any(Function),
    );
  });
});

describe('useMessageThread', () => {
  const mockMessages = {
    messages: [
      {
        id: 'm1',
        senderId: 's1',
        receiverId: 'r1',
        content: 'hello',
        replyToId: null,
        readAt: null,
        createdAt: '2026-01-01',
      },
      {
        id: 'm2',
        senderId: 'r1',
        receiverId: 's1',
        content: 'hi',
        replyToId: null,
        readAt: null,
        createdAt: '2026-01-01',
      },
    ],
    nextCursor: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(friendsApi.getMessages).mockResolvedValue(mockMessages);
    vi.mocked(friendsApi.sendMessage).mockResolvedValue(undefined);
    vi.mocked(friendsApi.markAsRead).mockResolvedValue(undefined);
  });

  it('returns empty state when friendId is null', () => {
    const { result } = renderHook(() => useMessageThread(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(friendsApi.getMessages).not.toHaveBeenCalled();
  });

  it('fetches messages when friendId is provided', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.messages).toEqual(mockMessages.messages);
    expect(result.current.nextCursor).toBeNull();
    expect(friendsApi.getMessages).toHaveBeenCalledWith(
      'f1',
      undefined,
      50,
      expect.any(Object),
    );
    expect(friendsApi.markAsRead).toHaveBeenCalledWith('f1');
  });

  it('handles fetch error gracefully', async () => {
    vi.mocked(friendsApi.getMessages).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useMessageThread('f1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.messages).toEqual([]);
  });

  it('sends a message optimistically', async () => {
    vi.mocked(friendsApi.getMessages).mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.send('new message');
    });

    expect(friendsApi.sendMessage).toHaveBeenCalledWith(
      'f1',
      'new message',
      undefined,
    );
  });

  it('does not send empty messages', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.send('   ');
    });

    expect(friendsApi.sendMessage).not.toHaveBeenCalled();
  });

  it('loads more messages with cursor', async () => {
    vi.mocked(friendsApi.getMessages)
      .mockResolvedValueOnce({
        messages: mockMessages.messages,
        nextCursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        messages: [
          {
            id: 'm3',
            senderId: 's1',
            receiverId: 'r1',
            content: 'old',
            replyToId: null,
            readAt: null,
            createdAt: '2025-12-01',
          },
        ],
        nextCursor: null,
      });

    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.nextCursor).toBe('cursor1'));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(friendsApi.getMessages).toHaveBeenCalledWith('f1', 'cursor1', 50);
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.nextCursor).toBeNull();
  });

  it('does not load more when no cursor', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    // Only the initial fetch, no extra call
    expect(friendsApi.getMessages).toHaveBeenCalledTimes(1);
  });

  it('emits typing start/stop via socket', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.emitTypingStart();
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('message:typing_start', {
      receiverId: 'f1',
    });

    act(() => {
      result.current.emitTypingStop();
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('message:typing_stop', {
      receiverId: 'f1',
    });
  });

  it('receives real-time messages via socket', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newMsgCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'message:new');
    const handler = newMsgCall?.[1] as (data: {
      id: string;
      senderId: string;
      content: string;
      createdAt: string;
    }) => void;

    act(() => {
      handler({
        id: 'm99',
        senderId: 'f1',
        content: 'realtime!',
        createdAt: '2026-01-02',
      });
    });

    expect(result.current.messages.find((m) => m.id === 'm99')).toBeTruthy();
    expect(friendsApi.markAsRead).toHaveBeenCalledWith('f1');
  });

  it('ignores messages from other users', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCount = result.current.messages.length;

    const newMsgCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'message:new');
    const handler = newMsgCall?.[1] as (data: {
      id: string;
      senderId: string;
      content: string;
      createdAt: string;
    }) => void;

    act(() => {
      handler({
        id: 'm99',
        senderId: 'other-user',
        content: 'not for me',
        createdAt: '2026-01-02',
      });
    });

    expect(result.current.messages).toHaveLength(initialCount);
  });

  it('deduplicates incoming messages', async () => {
    const { result } = renderHook(() => useMessageThread('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newMsgCall = vi
      .mocked(mockSocket.on)
      .mock.calls.find((c) => c[0] === 'message:new');
    const handler = newMsgCall?.[1] as (data: {
      id: string;
      senderId: string;
      content: string;
      createdAt: string;
    }) => void;

    act(() => {
      handler({
        id: 'm1',
        senderId: 'f1',
        content: 'duplicate',
        createdAt: '2026-01-02',
      });
    });

    // m1 already exists, should not be added again
    expect(result.current.messages.filter((m) => m.id === 'm1')).toHaveLength(
      1,
    );
  });

  it('resets messages when friendId changes to null', async () => {
    const { result, rerender } = renderHook(({ id }) => useMessageThread(id), {
      initialProps: { id: 'f1' as string | null },
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    rerender({ id: null });

    expect(result.current.messages).toEqual([]);
  });
});
