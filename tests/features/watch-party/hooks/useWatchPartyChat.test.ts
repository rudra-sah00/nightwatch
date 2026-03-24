import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyChat } from '@/features/watch-party/chat/hooks/useWatchPartyChat';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  ChatMessage,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  sendPartyMessage: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('useWatchPartyChat', () => {
  const mockRoom = { id: 'room-1' } as WatchPartyRoom;
  const mockRtmSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    room: mockRoom,
    rtmSendMessage: mockRtmSendMessage,
    userId: 'user-1',
    currentUserName: 'User 1',
  };

  it('should initialize with empty messages and typing users', () => {
    const { result } = renderHook(() => useWatchPartyChat(defaultProps));
    expect(result.current.messages).toEqual([]);
    expect(result.current.typingUsers).toEqual([]);
  });

  it('should handle incoming CHAT RTM message', () => {
    const { result } = renderHook(() => useWatchPartyChat(defaultProps));
    const mockMsg = {
      type: 'CHAT' as const,
      messageId: 'msg-1',
      userId: 'user-2',
      userName: 'User 2',
      content: 'Hello',
      isSystem: false,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.handleIncomingRtmMessage(
        mockMsg as unknown as import('@/features/watch-party/media/hooks/useAgoraRtm').RTMMessage,
      );
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('should handle TYPING_START and TYPING_STOP RTM messages', () => {
    const { result } = renderHook(() => useWatchPartyChat(defaultProps));

    act(() => {
      result.current.handleIncomingRtmMessage({
        type: 'TYPING_START',
        userId: 'user-2',
        userName: 'User 2',
      } as unknown as import('@/features/watch-party/media/hooks/useAgoraRtm').RTMMessage);
    });
    expect(result.current.typingUsers).toContainEqual({
      userId: 'user-2',
      userName: 'User 2',
    });

    act(() => {
      result.current.handleIncomingRtmMessage({
        type: 'TYPING_STOP',
        userId: 'user-2',
      } as unknown as import('@/features/watch-party/media/hooks/useAgoraRtm').RTMMessage);
    });
    expect(result.current.typingUsers).toHaveLength(0);
  });

  it('should send message via RTM and REST', async () => {
    vi.mocked(api.sendPartyMessage).mockResolvedValue({
      message: { id: 'real-id', content: 'Hi' } as ChatMessage,
    });

    const { result } = renderHook(() => useWatchPartyChat(defaultProps));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAT',
        content: 'Hi',
      }),
    );
    expect(api.sendPartyMessage).toHaveBeenCalledWith('room-1', 'Hi');
  });

  it('should handle send failure and rollback optimistic update', async () => {
    vi.mocked(api.sendPartyMessage).mockResolvedValue({
      error: 'Failed',
    });

    const { result } = renderHook(() => useWatchPartyChat(defaultProps));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to send message');
    expect(result.current.messages).toHaveLength(0); // Rolled back
  });
});
