import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useControlsHelp } from '@/features/watch-party/theatre/hooks/use-controls-help';
import { CHAT_SURFACE_ATTR } from '@/features/watch-party/theatre/lib/keyboard';

const SEEN_KEY = 'nightwatch.theatre.controlsSeen';

function press(
  key: string,
  options: { on?: HTMLElement; shift?: boolean } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options.shift ?? false,
    bubbles: true,
    // Cancelable, or `preventDefault` is a no-op and every assertion about it
    // passes for the wrong reason.
    cancelable: true,
  });
  act(() => {
    (options.on ?? window).dispatchEvent(event);
  });
  return event;
}

describe('useControlsHelp', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows the card unasked on a first visit', () => {
    /*
      The half that matters most. A keyboard-only room is not discoverable by
      pressing things: `WASD` is guessable, `R` and `V` are not, and `E` announces
      itself only once you are already standing on a seat pad.
    */
    const { result } = renderHook(() => useControlsHelp(true));
    expect(result.current.open).toBe(true);
  });

  it('does not show it again in a later session', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useControlsHelp(true));
    expect(result.current.open).toBe(false);
  });

  it('records the first visit, so the next one is quiet', () => {
    renderHook(() => useControlsHelp(true));
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  it('toggles on H', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useControlsHelp(true));
    press('h');
    expect(result.current.open).toBe(true);
    press('H');
    expect(result.current.open).toBe(false);
  });

  it('opens on ?, the other convention people arrive with', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useControlsHelp(true));
    // Shift+/ on most layouts, so it arrives with shiftKey set — and Shift is also
    // the run key, which is why a bare Shift must match nothing.
    press('?', { shift: true });
    expect(result.current.open).toBe(true);
    press('Shift', { shift: true });
    expect(result.current.open).toBe(true);
  });

  it('closes on Escape, but only while it is open', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useControlsHelp(true));

    // Closed: Escape is the player's, for leaving fullscreen.
    const ignored = press('Escape');
    expect(ignored.defaultPrevented).toBe(false);

    press('h');
    const handled = press('Escape');
    expect(handled.defaultPrevented).toBe(true);
    expect(result.current.open).toBe(false);
  });

  it('ignores H typed into the chat box', () => {
    localStorage.setItem(SEEN_KEY, '1');
    document.body.innerHTML = `<div ${CHAT_SURFACE_ATTR}><input id="chat" /></div>`;
    const field = document.getElementById('chat') as HTMLInputElement;
    const { result } = renderHook(() => useControlsHelp(true));

    press('h', { on: field });
    expect(result.current.open).toBe(false);
  });

  it('leaves modified H to the browser', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useControlsHelp(true));
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'h',
            [mod]: true,
            bubbles: true,
          }),
        );
      });
      expect(result.current.open).toBe(false);
    }
  });

  it('does nothing at all outside 3D', () => {
    const { result } = renderHook(() => useControlsHelp(false));
    expect(result.current.open).toBe(false);
    press('h');
    expect(result.current.open).toBe(false);
    // And it has not burned the first-visit flag on a session that never saw 3D.
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('closes when 3D is left, so returning does not land behind a dismissed card', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result, rerender } = renderHook(
      (props: { active: boolean }) => useControlsHelp(props.active),
      { initialProps: { active: true } },
    );
    press('h');
    expect(result.current.open).toBe(true);

    rerender({ active: false });
    expect(result.current.open).toBe(false);
  });
});
