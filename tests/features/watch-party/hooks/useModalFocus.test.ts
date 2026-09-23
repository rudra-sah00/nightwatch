import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useModalFocus } from '@/features/watch-party/hooks/use-modal-focus';

/**
 * Keyboard containment for the party's two hand-rolled modals.
 *
 * Neither the leave confirmation nor the settings panel trapped focus: Tab walked
 * out of the dialog onto the sidebar buttons and player controls behind the
 * backdrop, so a keyboard user could operate the party they had just been asked
 * whether to leave.
 */

function buildDom() {
  document.body.innerHTML = `
    <button type="button" id="opener">open</button>
    <button type="button" id="outside">behind the backdrop</button>
    <div id="dialog" tabindex="-1">
      <button type="button" id="cancel">cancel</button>
      <input id="field" />
      <button type="button" id="confirm">confirm</button>
    </div>
  `;
  const byId = (id: string) => document.getElementById(id) as HTMLElement;
  return {
    dialog: byId('dialog'),
    opener: byId('opener'),
    outside: byId('outside'),
    cancel: byId('cancel'),
    field: byId('field'),
    confirm: byId('confirm'),
  };
}

function mount(open: boolean, onClose = vi.fn()) {
  const dom = buildDom();
  // happy-dom reports offsetParent as null, which the hook uses to skip hidden
  // controls. Make the three real controls visible to it.
  for (const el of [dom.cancel, dom.field, dom.confirm]) {
    Object.defineProperty(el, 'offsetParent', {
      value: dom.dialog,
      configurable: true,
    });
  }

  const view = renderHook(
    (props: { open: boolean }) =>
      useModalFocus<HTMLDivElement>(props.open, onClose),
    { initialProps: { open } },
  );
  // The hook owns the ref; point it at the dialog the way JSX would.
  view.result.current.current = dom.dialog as HTMLDivElement;
  return { ...view, dom, onClose };
}

function press(key: string, shiftKey = false) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
    );
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useModalFocus', () => {
  it('closes on Escape', () => {
    const { onClose, rerender } = mount(false);
    rerender({ open: true });
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog when it opens', () => {
    const { dom, rerender } = mount(false);
    dom.opener.focus();
    rerender({ open: true });
    expect(document.activeElement).toBe(dom.cancel);
  });

  it('wraps Tab from the last control back to the first', () => {
    const { dom, rerender } = mount(false);
    rerender({ open: true });
    dom.confirm.focus();
    press('Tab');
    expect(document.activeElement).toBe(dom.cancel);
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const { dom, rerender } = mount(false);
    rerender({ open: true });
    dom.cancel.focus();
    press('Tab', true);
    expect(document.activeElement).toBe(dom.confirm);
  });

  it('pulls focus back in when it has escaped behind the backdrop', () => {
    // The state the missing trap left the page in: focus on a control the user
    // cannot see, under a blurred overlay.
    const { dom, rerender } = mount(false);
    rerender({ open: true });
    dom.outside.focus();
    press('Tab');
    expect(document.activeElement).toBe(dom.cancel);
  });

  it('leaves Tab alone between the middle controls', () => {
    const { dom, rerender } = mount(false);
    rerender({ open: true });
    dom.cancel.focus();
    press('Tab');
    // Not wrapped: the browser's own sequential navigation handles this.
    expect(document.activeElement).toBe(dom.cancel);
  });

  it('restores focus to whatever opened it', () => {
    const { dom, rerender } = mount(false);
    dom.opener.focus();
    rerender({ open: true });
    expect(document.activeElement).not.toBe(dom.opener);
    rerender({ open: false });
    expect(document.activeElement).toBe(dom.opener);
  });

  it('does nothing at all while closed', () => {
    const { dom, onClose } = mount(false);
    dom.outside.focus();
    press('Escape');
    press('Tab');
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(dom.outside);
  });
});
