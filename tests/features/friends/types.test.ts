import { describe, expect, it } from 'vitest';
import type {
  ConversationPreview,
  FriendProfile,
  FriendRequest,
  Message,
  MessagesResponse,
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
    };
    expect(friend.id).toBe('1');
    expect(friend.isOnline).toBe(true);
  });

  it('FriendRequest has required fields', () => {
    const req: FriendRequest = {
      id: 'r1',
      senderId: 's1',
      createdAt: '2026-01-01',
      name: 'Bob',
      username: null,
      profilePhoto: null,
    };
    expect(req.senderId).toBe('s1');
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

  it('Message has required fields', () => {
    const msg: Message = {
      id: 'm1',
      senderId: 's1',
      receiverId: 'r1',
      content: 'hello',
      replyToId: null,
      readAt: null,
      createdAt: '2026-01-01',
    };
    expect(msg.content).toBe('hello');
    expect(msg.readAt).toBeNull();
  });

  it('ConversationPreview has required fields', () => {
    const conv: ConversationPreview = {
      friendId: 'f1',
      name: 'Alice',
      username: 'alice',
      profilePhoto: null,
      lastMessage: 'hi',
      lastMessageAt: '2026-01-01',
      unreadCount: 3,
      isOnline: false,
    };
    expect(conv.unreadCount).toBe(3);
  });

  it('MessagesResponse has messages and cursor', () => {
    const res: MessagesResponse = {
      messages: [],
      nextCursor: null,
    };
    expect(res.messages).toEqual([]);
    expect(res.nextCursor).toBeNull();
  });

  it('MessagesResponse with cursor', () => {
    const res: MessagesResponse = {
      messages: [
        {
          id: 'm1',
          senderId: 's1',
          receiverId: 'r1',
          content: 'test',
          replyToId: null,
          readAt: null,
          createdAt: '2026-01-01',
        },
      ],
      nextCursor: 'm0',
    };
    expect(res.messages).toHaveLength(1);
    expect(res.nextCursor).toBe('m0');
  });
});
