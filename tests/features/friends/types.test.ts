import { describe, expect, it } from 'vitest';
import type {
  FriendProfile,
  FriendRequest,
  SentRequest,
} from '@/features/friends/types';

describe('Friends Types', () => {
  it('FriendProfile has required fields', () => {
    const friend: FriendProfile = {
      id: '1',
      name: 'Alice',
      username: 'alice',
      profilePhoto: null,
      isOnline: true,
      activity: null,
    };
    expect(friend.id).toBe('1');
    expect(friend.isOnline).toBe(true);
  });

  it('FriendRequest has required fields', () => {
    const req: FriendRequest = {
      id: 'r1',
      senderId: 's2',
      createdAt: '2026-01-01',
      name: 'Bob',
      username: null,
      profilePhoto: null,
    };
    expect(req.senderId).toBe('s2');
  });

  it('SentRequest has required fields', () => {
    const req: SentRequest = {
      id: 'r2',
      receiverId: 'r1',
      createdAt: '2026-01-01',
      name: 'Carol',
      username: 'carol',
      profilePhoto: null,
    };
    expect(req.receiverId).toBe('r1');
  });
});
