/**
 * Regression tests for SEEKING.md D3/D12 and PLAYER_AUDIT H8 — the scrub bars committed a
 * real seek on every move event.
 *
 * Desktop seeked on `mousemove` while the button was held (`use-seek-bar.ts` `handleDrag`
 * → `handleClick` → `onSeek`), and mobile on every `touchmove`
 * (`PlayerMobileSeekBar`'s `onTouchMove` → `seekFromTouch`). That is 60–120+
 * `currentTime` writes per second of drag. Each one emits `seeking`, which makes hls.js
 * abort the fragments in flight and, on open-GOP content, re-prime the buffer; a burst
 * exhausts `fragLoadingMaxRetry` and escalates to a fatal decode error. Every seek but the
 * last was wasted anyway, since the browser coalesces intermediate `seeked` events.
 *
 * Desktop also bound `onClick` alongside the drag, so a drag ended with a redundant extra
 * seek, and used mouse events only — the drag died if the cursor left the bar, and
 * `mouseleave` killed the preview mid-gesture.
 *
 * Both now share one `useDragSeek` primitive: preview while moving, exactly one seek on
 * release, with pointer capture so the gesture survives leaving the bar.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeekBar } from '@/features/watch/player/ui/controls/SeekBar';

/**
 * happy-dom implements neither the pointer-capture methods nor `getBoundingClientRect`
 * width, so both are stubbed: capture is a no-op here because jsdom-style environments
 * deliver events to the target regardless, and a fixed 200px box makes fractions exact.
 */
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 200,
    bottom: 10,
    width: 200,
    height: 10,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

const DURATION = 100;

function renderBar(onSeek: (t: number) => void, disabled = false) {
  render(
    <SeekBar
      currentTime={10}
      duration={DURATION}
      buffered={50}
      onSeek={onSeek}
      allowPreview
      disabled={disabled}
    />,
  );
  return screen.getByRole('slider');
}

/** A pointerdown/move.../up gesture across the bar. */
function drag(
  bar: Element,
  from: number,
  to: number,
  steps = 20,
  pointerId = 1,
) {
  fireEvent.pointerDown(bar, {
    pointerId,
    pointerType: 'mouse',
    button: 0,
    clientX: from,
  });
  for (let i = 1; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps;
    fireEvent.pointerMove(bar, { pointerId, pointerType: 'mouse', clientX: x });
  }
  fireEvent.pointerUp(bar, { pointerId, pointerType: 'mouse', clientX: to });
}

describe('SeekBar drag commits once (SEEKING.md D3)', () => {
  it('issues exactly one seek for a drag across the bar', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    drag(bar, 20, 160);

    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('seeks to the release position, not to where the drag began', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    drag(bar, 20, 160);

    // 160 / 200 of a 100s duration.
    expect(onSeek).toHaveBeenCalledWith(80);
  });

  it('issues no seek at all while the pointer is still moving', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    fireEvent.pointerDown(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 20,
    });
    for (let i = 0; i < 30; i++) {
      fireEvent.pointerMove(bar, {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 20 + i * 4,
      });
    }

    expect(onSeek).not.toHaveBeenCalled();
  });

  /** A tap is pointerdown+pointerup at one place, which the release commit covers. */
  it('still seeks on a simple tap', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    drag(bar, 100, 100, 0);

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(50);
  });

  /**
   * The old implementation bound `onClick` as well as the drag, so a real click produced a
   * second seek on top of the gesture's.
   */
  it('does not seek twice when a click follows the gesture', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    drag(bar, 100, 100, 0);
    fireEvent.click(bar, { clientX: 100 });

    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  /**
   * Pointer capture means moves keep arriving after the pointer leaves the bar, so a drag
   * that strays vertically still commits where the user released.
   */
  it('survives the pointer leaving the bar mid-drag', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    fireEvent.pointerDown(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 20,
    });
    fireEvent.pointerLeave(bar, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 140,
    });
    fireEvent.pointerUp(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 140,
    });

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(70);
  });

  /** A pointer the OS takes away did not express a chosen position. */
  it('abandons the gesture on pointercancel without seeking', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    fireEvent.pointerDown(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 20,
    });
    fireEvent.pointerMove(bar, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 140,
    });
    fireEvent.pointerCancel(bar, { pointerId: 1, pointerType: 'mouse' });

    expect(onSeek).not.toHaveBeenCalled();
  });

  it('claims the pointer so the browser cannot scroll the page instead', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    // Set inline rather than via a class, so it holds regardless of CSS loading.
    expect((bar as HTMLElement).style.touchAction).toBe('none');
  });

  it('never seeks when disabled, however far it is dragged', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek, true);

    drag(bar, 20, 160);

    expect(onSeek).not.toHaveBeenCalled();
  });

  /** Keyboard seeking is a separate, already-correct path and must keep working. */
  it('still seeks by keyboard', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    fireEvent.keyDown(bar, { key: 'ArrowRight' });

    expect(onSeek).toHaveBeenCalledWith(20);
  });

  /** A second finger must not hijack a gesture already in progress. */
  it('ignores a second pointer during a drag', () => {
    const onSeek = vi.fn();
    const bar = renderBar(onSeek);

    fireEvent.pointerDown(bar, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 20,
    });
    fireEvent.pointerDown(bar, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 180,
    });
    fireEvent.pointerUp(bar, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 180,
    });

    expect(onSeek).not.toHaveBeenCalled();

    fireEvent.pointerUp(bar, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 60,
    });

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(30);
  });
});
