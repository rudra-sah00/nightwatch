import { createTTLCache } from '@/lib/cache';
import { apiFetch } from '@/lib/fetch';
import type {
  ConversationPreview,
  FriendProfile,
  FriendRequest,
  MessagesResponse,
  SentRequest,
} from './types';

const friendsCache = createTTLCache<FriendProfile[]>(30_000, 1);
const conversationsCache = createTTLCache<ConversationPreview[]>(15_000, 1);

export async function getFriends(
  options?: RequestInit,
): Promise<FriendProfile[]> {
  const cached = friendsCache.get('all');
  if (cached) return cached;

  const { data } = await apiFetch<{ data: FriendProfile[] }>(
    '/api/friends',
    options,
  );
  friendsCache.set('all', data);
  return data;
}

export async function getPendingRequests(
  options?: RequestInit,
): Promise<FriendRequest[]> {
  const { data } = await apiFetch<{ data: FriendRequest[] }>(
    '/api/friends/requests/pending',
    options,
  );
  return data;
}

export async function getSentRequests(
  options?: RequestInit,
): Promise<SentRequest[]> {
  const { data } = await apiFetch<{ data: SentRequest[] }>(
    '/api/friends/requests/sent',
    options,
  );
  return data;
}

export async function sendFriendRequest(username: string): Promise<void> {
  await apiFetch('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  friendsCache.clear();
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
  friendsCache.clear();
}

export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/reject', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
}

export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/cancel', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
  friendsCache.clear();
}

export async function removeFriend(friendUserId: string): Promise<void> {
  await apiFetch('/api/friends/remove', {
    method: 'DELETE',
    body: JSON.stringify({ userId: friendUserId }),
  });
  friendsCache.clear();
}

export async function blockUser(userId: string): Promise<void> {
  await apiFetch('/api/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  friendsCache.clear();
}

export async function unblockUser(userId: string): Promise<void> {
  await apiFetch('/api/friends/unblock', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  friendsCache.clear();
}

export interface BlockedUser {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

export async function getBlockedUsers(
  options?: RequestInit,
): Promise<BlockedUser[]> {
  const { data } = await apiFetch<{ data: BlockedUser[] }>(
    '/api/friends/blocked',
    options,
  );
  return data;
}

// === Messages ===

export async function getConversations(
  options?: RequestInit,
): Promise<ConversationPreview[]> {
  const cached = conversationsCache.get('all');
  if (cached) return cached;

  const { data } = await apiFetch<{ data: ConversationPreview[] }>(
    '/api/messages/conversations',
    options,
  );
  conversationsCache.set('all', data);
  return data;
}

export async function getMessages(
  friendId: string,
  cursor?: string,
  limit = 50,
  options?: RequestInit,
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit !== 50) params.set('limit', String(limit));
  const qs = params.toString();

  const { data } = await apiFetch<{ data: MessagesResponse }>(
    `/api/messages/${friendId}${qs ? `?${qs}` : ''}`,
    options,
  );
  return data;
}

export async function sendMessage(
  receiverId: string,
  content: string,
): Promise<void> {
  await apiFetch('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify({ receiverId, content }),
  });
  conversationsCache.clear();
}

export async function markAsRead(friendId: string): Promise<void> {
  await apiFetch('/api/messages/read', {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
  conversationsCache.clear();
}

export function invalidateFriendsCache() {
  friendsCache.clear();
  conversationsCache.clear();
}

export interface SearchUserResult {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

export async function searchUsers(
  query: string,
  options?: RequestInit,
): Promise<SearchUserResult[]> {
  if (!query || query.length < 2) return [];
  const { data } = await apiFetch<{ data: SearchUserResult[] }>(
    `/api/friends/search?q=${encodeURIComponent(query)}`,
    options,
  );
  return data;
}
