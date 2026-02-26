import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyChat } from '@/features/watch-party/hooks/useWatchPartyChat';
import * as api from '@/features/watch-party/services/watch-party.api';
import type { ChatMessage } from '@/features/watch-party/types';

interface UserTyping {
  userId: string;
  userName: string;
  isTyping: boolean;
}

vi.mock('@/features/watch-party/services/watch-party.api', () => ({
  sendPartyMessage: vi.fn(),
  onPartyMessage: vi.fn(() => vi.fn()),
  onUserTyping: vi.fn(() => vi.fn()),
  emitTypingStart: vi.fn(),
  emitTypingStop: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('useWatchPartyChat', () => {
  let messageHandler: (message: ChatMessage) => void;
  let typingHandler: (data: UserTyping) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.onPartyMessage).mockImplementation((cb) => {
      messageHandler = cb;
      return vi.fn();
    });
    vi.mocked(api.onUserTyping).mockImplementation((cb) => {
      typingHandler = cb;
      return vi.fn();
    });
  });

  it('should initialize with empty messages and typing users', () => {
    const { result } = renderHook(() => useWatchPartyChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.typingUsers).toEqual([]);
  });

  it('should add message when received via socket', () => {
    const { result } = renderHook(() => useWatchPartyChat());
    const mockMessage: ChatMessage = {
      id: '1',
      roomId: 'room-1',
      content: 'Hello',
      userId: 'user-1',
      userName: 'User 1',
      isSystem: false,
      timestamp: Date.now(),
    };

    act(() => {
      messageHandler(mockMessage);
    });

    expect(result.current.messages).toContainEqual(mockMessage);
  });

  it('should update typing users and ignore duplicates', () => {
    const { result } = renderHook(() => useWatchPartyChat());

    act(() => {
      typingHandler({ userId: 'user-1', userName: 'User 1', isTyping: true });
    });
    expect(result.current.typingUsers).toHaveLength(1);

    act(() => {
      typingHandler({ userId: 'user-1', userName: 'User 1', isTyping: true }); // Duplicate
    });
    expect(result.current.typingUsers).toHaveLength(1);

    act(() => {
      typingHandler({ userId: 'user-1', userName: 'User 1', isTyping: false });
    });
    expect(result.current.typingUsers).toHaveLength(0);
  });

  it('should handle message success', () => {
    vi.mocked(api.sendPartyMessage).mockImplementation((_content, cb) => {
      cb?.({ success: true });
    });

    const { result } = renderHook(() => useWatchPartyChat());
    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(api.sendPartyMessage).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should call sendPartyMessage and handle error', () => {
    vi.mocked(api.sendPartyMessage).mockImplementation((_content, cb) => {
      cb?.({ success: false, error: 'Failed' });
    });

    const { result } = renderHook(() => useWatchPartyChat());
    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(api.sendPartyMessage).toHaveBeenCalledWith(
      'Hello',
      expect.any(Function),
    );
    expect(toast.error).toHaveBeenCalledWith('Failed to send message');
  });
});
