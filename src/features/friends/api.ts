import { createTTLCache } from '@/lib/cache';
import { apiFetch } from '@/lib/fetch';
import type { FriendProfile, FriendRequest, SentRequest } from './types';

const friendsCache = createTTLCache<FriendProfile[]>(30_000, 1);

/**
 * Fetches the authenticated user's friend list with a 30-second TTL cache.
 *
 * @param options - Optional `RequestInit` overrides forwarded to `apiFetch`.
 * @returns The list of {@link FriendProfile} objects.
 */
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

/**
 * Fetches incoming friend requests awaiting the user's response.
 *
 * @param options - Optional `RequestInit` overrides.
 * @returns An array of {@link FriendRequest} objects.
 */
export async function getPendingRequests(
  options?: RequestInit,
): Promise<FriendRequest[]> {
  const { data } = await apiFetch<{ data: FriendRequest[] }>(
    '/api/friends/requests/pending',
    options,
  );
  return data;
}

/**
 * Fetches outgoing friend requests the user has sent.
 *
 * @param options - Optional `RequestInit` overrides.
 * @returns An array of {@link SentRequest} objects.
 */
export async function getSentRequests(
  options?: RequestInit,
): Promise<SentRequest[]> {
  const { data } = await apiFetch<{ data: SentRequest[] }>(
    '/api/friends/requests/sent',
    options,
  );
  return data;
}

/**
 * Sends a friend request to the user with the given username.
 *
 * @param username - The target user's username.
 */
export async function sendFriendRequest(username: string): Promise<void> {
  await apiFetch('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  friendsCache.clear();
}

/**
 * Accepts an incoming friend request.
 *
 * @param friendshipId - The friendship record ID to accept.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
  friendsCache.clear();
}

/**
 * Rejects an incoming friend request.
 *
 * @param friendshipId - The friendship record ID to reject.
 */
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/reject', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
}

/**
 * Cancels a previously sent outgoing friend request.
 *
 * @param friendshipId - The friendship record ID to cancel.
 */
export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await apiFetch('/api/friends/cancel', {
    method: 'POST',
    body: JSON.stringify({ friendshipId }),
  });
  friendsCache.clear();
}

/**
 * Removes an existing friend from the user's friend list.
 *
 * @param friendUserId - The user ID of the friend to remove.
 */
export async function removeFriend(friendUserId: string): Promise<void> {
  await apiFetch('/api/friends/remove', {
    method: 'DELETE',
    body: JSON.stringify({ userId: friendUserId }),
  });
  friendsCache.clear();
}

/**
 * Blocks a user, preventing further friend requests and interactions.
 *
 * @param userId - The user ID to block.
 */
export async function blockUser(userId: string): Promise<void> {
  await apiFetch('/api/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  friendsCache.clear();
}

/**
 * Unblocks a previously blocked user.
 *
 * @param userId - The user ID to unblock.
 */
export async function unblockUser(userId: string): Promise<void> {
  await apiFetch('/api/friends/unblock', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  friendsCache.clear();
}

/** A user that has been blocked by the authenticated user. */
export interface BlockedUser {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

/**
 * Fetches the list of users blocked by the authenticated user.
 *
 * @param options - Optional `RequestInit` overrides.
 * @returns An array of {@link BlockedUser} objects.
 */
export async function getBlockedUsers(
  options?: RequestInit,
): Promise<BlockedUser[]> {
  const { data } = await apiFetch<{ data: BlockedUser[] }>(
    '/api/friends/blocked',
    options,
  );
  return data;
}

/** Clears the in-memory friends TTL cache, forcing the next fetch to hit the API. */
export function invalidateFriendsCache() {
  friendsCache.clear();
}

/** A user returned from the friend search endpoint. */
export interface SearchUserResult {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

/**
 * Searches for users by name or username (minimum 2 characters).
 *
 * @param query - The search string.
 * @param options - Optional `RequestInit` overrides.
 * @returns Matching {@link SearchUserResult} entries, or an empty array if the query is too short.
 */
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
