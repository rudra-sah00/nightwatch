import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LONG_PRESS_MS, useLongPress } from '@/hooks/use-long-press';

const onLongPress = vi.fn();
const onClick = vi.fn();

function Probe({ delay }: { delay?: number } = {}) {
  const { isPressing, handlers } = useLongPress({
    onLongPress,
    onClick,
    delay,
  });
  return (
    <button type="button" {...handlers}>
      {isPressing ? 'pressing' : 'idle'}
    </button>
  );
}

beforeEach(() => {
  onLongPress.mockClear();
  onClick.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// fireEvent is used rather than raw dispatch because React derives
// onPointerLeave from pointerout delegation, so a hand-built 'pointerleave'
// never reaches the handler.
const press = (el: Element) => fireEvent.pointerDown(el);
const release = (el: Element) => fireEvent.pointerUp(el);
const leave = (el: Element) => fireEvent.pointerLeave(el);
const click = (el: Element) => fireEvent.click(el);

describe('useLongPress — hold', () => {
  it('fires once the threshold is reached', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('reports the pressing state for hold feedback, then clears it', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    expect(button).toHaveTextContent('pressing');

    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });
    expect(button).toHaveTextContent('idle');
  });

  it('honours a custom delay', () => {
    render(<Probe delay={1000} />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('useLongPress — cancellation', () => {
  it('does not fire when released early', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS - 100);
    });
    act(() => release(button));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(button).toHaveTextContent('idle');
  });

  it('does not fire when the pointer leaves mid-hold', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => leave(button));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS * 2);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('useLongPress — click interaction', () => {
  it('runs onClick for a short press', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => release(button));
    act(() => click(button));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('swallows the click synthesised after a completed hold', () => {
    // Otherwise holding to close would also trigger the tap action.
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });
    act(() => click(button));

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('allows a click again after a hold has been consumed', () => {
    render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });
    act(() => click(button));
    act(() => click(button));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('useLongPress — cleanup', () => {
  it('does not fire after unmount', () => {
    const { unmount } = render(<Probe />);
    const button = screen.getByRole('button');

    act(() => press(button));
    unmount();
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS * 2);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
