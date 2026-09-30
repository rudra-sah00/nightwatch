/**
 * Regression tests for PLAYER_AUDIT H8 — the mobile seek bar seeked on every `touchmove`.
 *
 * `onTouchMove` called `seekFromTouch` directly, so a drag scrub issued roughly 60
 * `currentTime` writes per second: the mobile twin of SEEKING.md D3, and
 * decode-error-sensitive for the same reason. Each write emits `seeking`, which makes
 * hls.js abort the fragments in flight and re-prime the buffer on open-GOP content.
 *
 * It now shares `useDragSeek` with the desktop `SeekBar`, so it previews while moving and
 * commits one seek on release.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSeek = vi.fn();
let isPortrait = false;
let readOnly = false;

const mockPlayerContext = {
  state: { currentTime: 10, duration: 100, buffered: 50 },
  playerHandlers: { seek: mockSeek },
  get readOnly() {
    return readOnly;
  },
};

vi.mock('@/features/watch/player/context/PlayerContext', () => ({
  usePlayerContext: () => mockPlayerContext,
}));

vi.mock('@/features/watch/player/hooks/useMobileOrientation', () => ({
  useMobileOrientation: () => isPortrait,
}));

import { PlayerMobileSeekBar } from '@/features/watch/player/ui/compound/PlayerMobileSeekBar';

beforeEach(() => {
  vi.clearAllMocks();
  isPortrait = false;
  readOnly = false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 200,
    bottom: 40,
    width: 200,
    height: 40,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

/** A touch drag across the bar. */
function drag(bar: Element, from: number, to: number, steps = 20) {
  fireEvent.pointerDown(bar, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: from,
  });
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(bar, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: from + ((to - from) * i) / steps,
    });
  }
  fireEvent.pointerUp(bar, { pointerId: 1, pointerType: 'touch', clientX: to });
}

describe('PlayerMobileSeekBar drag commits once (PLAYER_AUDIT H8)', () => {
  it('issues exactly one seek for a touch drag', () => {
    render(<PlayerMobileSeekBar />);
    const bar = screen.getByRole('slider');

    drag(bar, 20, 160);

    expect(mockSeek).toHaveBeenCalledTimes(1);
  });

  it('seeks to the release position', () => {
    render(<PlayerMobileSeekBar />);

    drag(screen.getByRole('slider'), 20, 160);

    // 160 / 200 of a 100s duration.
    expect(mockSeek).toHaveBeenCalledWith(80);
  });

  it('issues no seek while the finger is still moving', () => {
    render(<PlayerMobileSeekBar />);
    const bar = screen.getByRole('slider');

    fireEvent.pointerDown(bar, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 20,
    });
    for (let i = 0; i < 30; i++) {
      fireEvent.pointerMove(bar, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 20 + i * 4,
      });
    }

    expect(mockSeek).not.toHaveBeenCalled();
  });

  it('still seeks on a tap', () => {
    render(<PlayerMobileSeekBar />);

    drag(screen.getByRole('slider'), 100, 100, 0);

    expect(mockSeek).toHaveBeenCalledWith(50);
  });

  it('sets touch-action none so the page does not scroll instead', () => {
    render(<PlayerMobileSeekBar />);

    expect((screen.getByRole('slider') as HTMLElement).style.touchAction).toBe(
      'none',
    );
  });

  /** Portrait is display-only, matching YouTube's mobile portrait UX. */
  it('renders no interactive slider in portrait', () => {
    isPortrait = true;

    render(<PlayerMobileSeekBar />);

    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('does not seek for watch-party guests', () => {
    readOnly = true;
    render(<PlayerMobileSeekBar />);

    drag(screen.getByRole('slider'), 20, 160);

    expect(mockSeek).not.toHaveBeenCalled();
  });

  it('still seeks by keyboard', () => {
    render(<PlayerMobileSeekBar />);

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(mockSeek).toHaveBeenCalledWith(20);
  });
});
