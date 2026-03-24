import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmojiReactions } from '@/features/watch-party/interactions/hooks/use-emoji-reactions';

describe('useEmojiReactions', () => {
  const mockRtmSendMessage = vi.fn();
  const defaultProps = {
    rtmSendMessage: mockRtmSendMessage,
    userId: 'user-1',
    userName: 'User 1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with showPicker=false', () => {
    const { result } = renderHook(() => useEmojiReactions(defaultProps));
    expect(result.current.showPicker).toBe(false);
  });

  it('handleTriggerEmoji calls rtmSendMessage with INTERACTION type', () => {
    const { result } = renderHook(() => useEmojiReactions(defaultProps));

    act(() => {
      result.current.handleTriggerEmoji('🔥');
    });

    expect(mockRtmSendMessage).toHaveBeenCalledWith({
      type: 'INTERACTION',
      kind: 'emoji',
      emoji: '🔥',
      userId: 'user-1',
      userName: 'User 1',
    });
  });

  it('handleTriggerEmoji closes picker when picker is open', () => {
    const { result } = renderHook(() => useEmojiReactions(defaultProps));

    act(() => {
      result.current.setShowPicker(true);
    });
    expect(result.current.showPicker).toBe(true);

    act(() => {
      result.current.handleTriggerEmoji('❤️');
    });
    expect(result.current.showPicker).toBe(false);
  });

  it('clicking outside closes picker', () => {
    const { result } = renderHook(() => useEmojiReactions(defaultProps));

    // Create DOM element for ref
    const div = document.createElement('div');
    result.current.pickerRef.current = div;

    act(() => {
      result.current.setShowPicker(true);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.showPicker).toBe(false);
  });
});
