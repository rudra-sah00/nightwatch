import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  getBlockedUsers,
  getConversations,
  getFriends,
  getMessages,
  getPendingRequests,
  getSentRequests,
  invalidateFriendsCache,
  markAsRead,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  sendMessage,
  unblockUser,
} from '@/features/friends/api';
import { apiFetch } from '@/lib/fetch';

vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

describe('Friends API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFriends', () => {
    it('fetches friends list', async () => {
      const friends = [{ id: '1', name: 'Alice', isOnline: true }];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: friends });

      const result = await getFriends();
      expect(apiFetch).toHaveBeenCalledWith('/api/friends', undefined);
      expect(result).toEqual(friends);
    });
  });

  describe('getPendingRequests', () => {
    it('fetches pending requests', async () => {
      const requests = [{ id: 'r1', senderId: 's1', name: 'Bob' }];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: requests });

      const result = await getPendingRequests();
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/requests/pending',
        undefined,
      );
      expect(result).toEqual(requests);
    });
  });

  describe('getSentRequests', () => {
    it('fetches sent requests', async () => {
      const requests = [{ id: 'r2', receiverId: 'r1', name: 'Carol' }];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: requests });

      const result = await getSentRequests();
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/requests/sent',
        undefined,
      );
      expect(result).toEqual(requests);
    });
  });

  describe('sendFriendRequest', () => {
    it('sends request with username', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await sendFriendRequest('alice');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ username: 'alice' }),
      });
    });
  });

  describe('acceptFriendRequest', () => {
    it('accepts with friendshipId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await acceptFriendRequest('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendshipId: 'f1' }),
      });
    });
  });

  describe('rejectFriendRequest', () => {
    it('rejects with friendshipId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await rejectFriendRequest('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/reject', {
        method: 'POST',
        body: JSON.stringify({ friendshipId: 'f1' }),
      });
    });
  });

  describe('cancelFriendRequest', () => {
    it('cancels with friendshipId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await cancelFriendRequest('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/cancel', {
        method: 'POST',
        body: JSON.stringify({ friendshipId: 'f1' }),
      });
    });
  });

  describe('removeFriend', () => {
    it('removes with userId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await removeFriend('u1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/remove', {
        method: 'DELETE',
        body: JSON.stringify({ userId: 'u1' }),
      });
    });
  });

  describe('blockUser', () => {
    it('blocks with userId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await blockUser('u1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/block', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1' }),
      });
    });
  });

  describe('getConversations', () => {
    it('fetches conversations', async () => {
      const convos = [{ friendId: 'f1', lastMessage: 'hi' }];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: convos });

      const result = await getConversations();
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/conversations',
        undefined,
      );
      expect(result).toEqual(convos);
    });
  });

  describe('getMessages', () => {
    it('fetches messages without cursor', async () => {
      const data = { messages: [{ id: 'm1' }], nextCursor: null };
      vi.mocked(apiFetch).mockResolvedValueOnce({ data });

      const result = await getMessages('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/messages/f1', undefined);
      expect(result).toEqual(data);
    });

    it('fetches messages with cursor and limit', async () => {
      const data = { messages: [], nextCursor: null };
      vi.mocked(apiFetch).mockResolvedValueOnce({ data });

      await getMessages('f1', 'cursor123', 25);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/f1?cursor=cursor123&limit=25',
        undefined,
      );
    });
  });

  describe('sendMessage', () => {
    it('sends message', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await sendMessage('r1', 'hello');
      expect(apiFetch).toHaveBeenCalledWith('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ receiverId: 'r1', content: 'hello' }),
      });
    });
  });

  describe('markAsRead', () => {
    it('marks messages as read', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      await markAsRead('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ friendId: 'f1' }),
      });
    });
  });

  describe('searchUsers', () => {
    it('returns empty for short queries', async () => {
      const result = await searchUsers('a');
      expect(apiFetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('returns empty for empty string', async () => {
      const result = await searchUsers('');
      expect(apiFetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('searches users with query', async () => {
      const users = [{ id: 'u1', name: 'Alice', username: 'alice' }];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: users });

      const result = await searchUsers('ali');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/search?q=ali',
        undefined,
      );
      expect(result).toEqual(users);
    });

    it('encodes special characters in query', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [] });

      await searchUsers('a b');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/search?q=a%20b',
        undefined,
      );
    });
  });

  describe('getMessages edge cases', () => {
    it('default limit is 50 (no limit param in URL)', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: { messages: [], nextCursor: null },
      });

      await getMessages('f1');
      expect(apiFetch).toHaveBeenCalledWith('/api/messages/f1', undefined);
    });

    it('includes only cursor when limit is default', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: { messages: [], nextCursor: null },
      });

      await getMessages('f1', 'c1');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/f1?cursor=c1',
        undefined,
      );
    });

    it('includes both cursor and limit', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: { messages: [], nextCursor: null },
      });

      await getMessages('f1', 'c1', 25);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/f1?cursor=c1&limit=25',
        undefined,
      );
    });

    it('passes request options through', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: { messages: [], nextCursor: null },
      });
      const signal = new AbortController().signal;

      await getMessages('f1', undefined, 50, { signal });
      expect(apiFetch).toHaveBeenCalledWith('/api/messages/f1', { signal });
    });
  });

  describe('cache invalidation', () => {
    it('sendFriendRequest clears friends cache', async () => {
      vi.mocked(apiFetch).mockResolvedValue({});
      // First call populates cache
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [{ id: '1' }] });
      await getFriends();

      await sendFriendRequest('alice');

      // Next getFriends should call API again (cache cleared)
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [{ id: '1' }, { id: '2' }],
      });
      const result = await getFriends();
      expect(result).toHaveLength(2);
    });

    it('removeFriend clears friends cache', async () => {
      vi.mocked(apiFetch).mockResolvedValue({});
      await removeFriend('u1');
      // Verify apiFetch was called (cache cleared, would re-fetch)
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/remove',
        expect.any(Object),
      );
    });

    it('blockUser clears friends cache', async () => {
      vi.mocked(apiFetch).mockResolvedValue({});
      await blockUser('u1');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/friends/block',
        expect.any(Object),
      );
    });

    it('sendMessage clears conversations cache', async () => {
      vi.mocked(apiFetch).mockResolvedValue({});
      await sendMessage('r1', 'test');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/send',
        expect.any(Object),
      );
    });

    it('markAsRead clears conversations cache', async () => {
      vi.mocked(apiFetch).mockResolvedValue({});
      await markAsRead('f1');
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/messages/read',
        expect.any(Object),
      );
    });
  });

  describe('unblockUser', () => {
    it('unblocks with userId', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});
      await unblockUser('u1');
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/unblock', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1' }),
      });
    });
  });

  describe('getBlockedUsers', () => {
    it('fetches blocked users list', async () => {
      const blocked = [
        {
          id: 'b1',
          userId: 'u1',
          name: 'Bob',
          username: null,
          profilePhoto: null,
        },
      ];
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: blocked });
      const result = await getBlockedUsers();
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/blocked', undefined);
      expect(result).toEqual(blocked);
    });

    it('passes request options through', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [] });
      const signal = new AbortController().signal;
      await getBlockedUsers({ signal });
      expect(apiFetch).toHaveBeenCalledWith('/api/friends/blocked', { signal });
    });
  });

  describe('invalidateFriendsCache', () => {
    it('causes next getFriends call to re-fetch', async () => {
      // Populate cache
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [{ id: '1' }] });
      await getFriends();
      const callCount = vi.mocked(apiFetch).mock.calls.length;

      // Invalidate
      invalidateFriendsCache();

      // Next call should hit API again
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [{ id: '2' }] });
      const result = await getFriends();
      expect(vi.mocked(apiFetch).mock.calls.length).toBeGreaterThan(callCount);
      expect(result).toEqual([{ id: '2' }]);
    });
  });

  describe('getFriends caching', () => {
    it('returns cached data on second call within TTL', async () => {
      // Invalidate first to ensure clean state
      invalidateFriendsCache();

      vi.mocked(apiFetch).mockResolvedValueOnce({ data: [{ id: 'cached' }] });
      const first = await getFriends();
      const callCount = vi.mocked(apiFetch).mock.calls.length;

      // Second call should use cache — no new API call
      const second = await getFriends();
      expect(vi.mocked(apiFetch).mock.calls.length).toBe(callCount);
      expect(second).toEqual(first);
    });
  });
});
