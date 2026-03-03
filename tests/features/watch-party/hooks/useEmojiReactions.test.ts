import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmojiReactions } from '@/features/watch-party/interactions/hooks/use-emoji-reactions';
import { emitPartyInteraction } from '@/features/watch-party/room/services/watch-party.api';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  emitPartyInteraction: vi.fn(),
}));

describe('useEmojiReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with showPicker=false', () => {
    const { result } = renderHook(() => useEmojiReactions());
    expect(result.current.showPicker).toBe(false);
  });

  it('setShowPicker toggles showPicker to true', () => {
    const { result } = renderHook(() => useEmojiReactions());
    act(() => {
      result.current.setShowPicker(true);
    });
    expect(result.current.showPicker).toBe(true);
  });

  it('handleTriggerEmoji calls emitPartyInteraction with emoji type', () => {
    const { result } = renderHook(() => useEmojiReactions());

    act(() => {
      result.current.handleTriggerEmoji('🔥');
    });

    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'emoji',
      value: '🔥',
    });
  });

  it('handleTriggerEmoji closes picker when picker is open', () => {
    const { result } = renderHook(() => useEmojiReactions());

    // Open the picker
    act(() => {
      result.current.setShowPicker(true);
    });
    expect(result.current.showPicker).toBe(true);

    // Triggering an emoji should close the picker
    act(() => {
      result.current.handleTriggerEmoji('❤️');
    });
    expect(result.current.showPicker).toBe(false);
  });

  it('clicking outside (pickerRef) closes picker when open', () => {
    const { result } = renderHook(() => useEmojiReactions());

    // Create a real DOM element to attach as pickerRef
    const pickerDiv = document.createElement('div');
    document.body.appendChild(pickerDiv);
    result.current.pickerRef.current = pickerDiv;

    // Open the picker
    act(() => {
      result.current.setShowPicker(true);
    });

    // Simulate a mousedown event on an element outside the picker
    const outsideElement = document.createElement('button');
    document.body.appendChild(outsideElement);

    act(() => {
      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', { value: outsideElement });
      document.dispatchEvent(event);
    });

    expect(result.current.showPicker).toBe(false);

    // Cleanup
    document.body.removeChild(pickerDiv);
    document.body.removeChild(outsideElement);
  });

  it('clicking inside picker does NOT close it', () => {
    const { result } = renderHook(() => useEmojiReactions());

    // Create a real DOM element hierarchy
    const pickerDiv = document.createElement('div');
    const innerButton = document.createElement('button');
    pickerDiv.appendChild(innerButton);
    document.body.appendChild(pickerDiv);
    result.current.pickerRef.current = pickerDiv;

    // Open the picker
    act(() => {
      result.current.setShowPicker(true);
    });

    // Simulate a mousedown event INSIDE the picker
    act(() => {
      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', { value: innerButton });
      document.dispatchEvent(event);
    });

    // Picker should still be open because the click was inside
    expect(result.current.showPicker).toBe(true);

    // Cleanup
    document.body.removeChild(pickerDiv);
  });

  it('does not add mousedown listener when picker is closed', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useEmojiReactions());
    // showPicker is false by default — no listener should be added
    expect(
      addEventListenerSpy.mock.calls.filter(([event]) => event === 'mousedown')
        .length,
    ).toBe(0);
    addEventListenerSpy.mockRestore();
  });
});
