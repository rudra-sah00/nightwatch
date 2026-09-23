import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useChatFocusHotkey } from '@/features/watch-party/chat/hooks/use-chat-focus-hotkey';
import { CHAT_SURFACE_ATTR } from '@/features/watch-party/theatre/lib/keyboard';

/**
 * `Enter` to type, the way a game does it.
 *
 * In 3D the keyboard drives the avatar, so the chat field cannot hold focus by
 * default — and while walking the pointer is locked and the cursor hidden, so the
 * mouse is not a way in either. Without this there is no way to start typing
 * without leaving the room.
 */

function setup(active = true) {
  document.body.innerHTML = `
    <div ${CHAT_SURFACE_ATTR}>
      <input id="chat" />
    </div>
    <input id="elsewhere" />
  `;
  const field = document.getElementById('chat') as HTMLInputElement;
  const ref = { current: field };
  renderHook(() => useChatFocusHotkey(ref, active));
  return { field, ref };
}

function press(
  key: string,
  options: { on?: HTMLElement; init?: KeyboardEventInit } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ...options.init,
  });
  (options.on ?? window).dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useChatFocusHotkey', () => {
  it('focuses the message field on Enter', () => {
    const { field } = setup();
    press('Enter');
    expect(document.activeElement).toBe(field);
  });

  it('does nothing while 3D is off', () => {
    // In 2D the field is reachable with a click, and Enter is not the theatre's to
    // take when the theatre is not on screen.
    const { field } = setup(false);
    press('Enter');
    expect(document.activeElement).not.toBe(field);
  });

  it('leaves Enter alone once the field has focus, so a line is not sent twice', () => {
    const { field } = setup();
    field.focus();
    const event = press('Enter', { on: field });
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores Enter typed into any other text field', () => {
    // The sidebar composer, the settings panel, a search box on the page.
    const { field } = setup();
    const other = document.getElementById('elsewhere') as HTMLInputElement;
    other.focus();
    press('Enter', { on: other });
    expect(document.activeElement).toBe(other);
    expect(document.activeElement).not.toBe(field);
  });

  it('ignores modified Enter, which belongs to the browser', () => {
    const { field } = setup();
    for (const init of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
    ]) {
      press('Enter', { init });
      expect(document.activeElement).not.toBe(field);
    }
  });

  it('ignores every other key, so movement still reaches the avatar', () => {
    const { field } = setup();
    for (const key of ['w', 'a', 's', 'd', 'e', 'r', 'v', ' ']) {
      press(key);
      expect(document.activeElement).not.toBe(field);
    }
  });

  it('is harmless when there is no field, as for a muted member', () => {
    renderHook(() => useChatFocusHotkey({ current: null }, true));
    expect(() => press('Enter')).not.toThrow();
  });

  it('stops listening once unmounted', () => {
    document.body.innerHTML = '<input id="chat" />';
    const field = document.getElementById('chat') as HTMLInputElement;
    const { unmount } = renderHook(() =>
      useChatFocusHotkey({ current: field }, true),
    );
    unmount();
    press('Enter');
    expect(document.activeElement).not.toBe(field);
  });
});
