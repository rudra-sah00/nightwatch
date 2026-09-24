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
        mockMsg as unknown as import('@/features/watch-party/room/types/rtm-messages').RTMMessage,
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
      } as unknown as import('@/features/watch-party/room/types/rtm-messages').RTMMessage);
    });
    expect(result.current.typingUsers).toContainEqual({
      userId: 'user-2',
      userName: 'User 2',
    });

    act(() => {
      result.current.handleIncomingRtmMessage({
        type: 'TYPING_STOP',
        userId: 'user-2',
      } as unknown as import('@/features/watch-party/room/types/rtm-messages').RTMMessage);
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

    // The server's own words win over the generic fallback, as the
    // approve/reject/kick paths already do.
    expect(toast.error).toHaveBeenCalledWith('Failed');
    expect(result.current.messages).toHaveLength(0); // Rolled back
  });

  /*
    The server enforces `canChat` now, so the likeliest POST failure is a
    host-imposed mute rather than a network fault. Reporting that as
    "message failed" told the member to retry something that will never work.
  */
  it('surfaces a host-imposed mute instead of a generic failure', async () => {
    vi.mocked(api.sendPartyMessage).mockResolvedValue({
      error: 'Chat is disabled for you in this room',
    });

    const { result } = renderHook(() => useWatchPartyChat(defaultProps));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Chat is disabled for you in this room',
    );
    expect(result.current.messages).toHaveLength(0);
  });

  /*
    A 2xx whose body lacked `message` — and carried no error string either — used to
    leave the optimistic copy in the list forever under its `temp-` id, neither
    confirmed nor rolled back. The invariant is whether the server stored anything.
  */
  it('rolls back when the server returns neither a message nor an error', async () => {
    vi.mocked(api.sendPartyMessage).mockResolvedValue({});

    const { result } = renderHook(() => useWatchPartyChat(defaultProps));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(toast.error).toHaveBeenCalledWith('messageFailed');
    expect(result.current.messages).toHaveLength(0);
  });
});
