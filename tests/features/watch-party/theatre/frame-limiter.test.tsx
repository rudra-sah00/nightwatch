import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const advance = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (s: { advance: unknown }) => unknown) =>
    selector({ advance }),
}));

import { FrameLimiter } from '@/features/watch-party/theatre/components/FrameLimiter';

/**
 * Frame cap for the 3D theatre.
 *
 * `requestAnimationFrame` is already vsync-locked, so this is a no-op on a 60 Hz
 * display and a real saving on a high-refresh one: a 120 Hz ProMotion laptop was
 * rendering twice the frames for a scene that looks identical at 60, and the scene
 * is fragment-bound so halving frames roughly halves GPU load.
 *
 * The case worth testing is the off-by-one. The naive guard
 * `if (t - last < 1000 / fps) return` skips roughly half the callbacks on a display
 * whose refresh equals the target — 16.667 ms threshold against rAF firing at
 * 16.6-16.7 ms with jitter — and the result is a rock-solid 30 fps. The tolerance
 * in `FrameLimiter` is what prevents that, so both refresh rates are asserted here.
 */
describe('FrameLimiter', () => {
  let callbacks: ((t: number) => void)[] = [];
  let nextId = 1;

  beforeEach(() => {
    advance.mockClear();
    callbacks = [];
    nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      callbacks.push(cb);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: () => 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Drive `frames` rAF callbacks spaced `stepMs` apart, as a display would. */
  function tick(frames: number, stepMs: number) {
    let t = 0;
    for (let i = 0; i < frames; i++) {
      const cb = callbacks.shift();
      if (!cb) break;
      t += stepMs;
      cb(t);
    }
  }

  it('renders every callback on a 60 Hz display', () => {
    render(<FrameLimiter fps={60} />);

    // 60 callbacks at the 60 Hz interval. A naive threshold would drop half of
    // these to jitter and settle at 30 fps.
    tick(60, 1000 / 60);

    expect(advance).toHaveBeenCalledTimes(60);
  });

  it('still renders every callback when 60 Hz jitters slightly fast', () => {
    render(<FrameLimiter fps={60} />);

    // 16.6 ms — under the 16.667 target, which is exactly the case that used to
    // halve the frame rate.
    tick(60, 16.6);

    expect(advance).toHaveBeenCalledTimes(60);
  });

  it('halves a 120 Hz display down to the 60 fps target', () => {
    render(<FrameLimiter fps={60} />);

    tick(120, 1000 / 120);

    // Every other callback. Allow one frame of slack for where the window lands.
    expect(advance.mock.calls.length).toBeGreaterThanOrEqual(59);
    expect(advance.mock.calls.length).toBeLessThanOrEqual(61);
  });

  /*
    Only divisors of the refresh rate are reachable when whole callbacks are
    skipped, so 144 Hz lands on 72 (every second callback) rather than 60. The
    alternative is every third at 48, which is further from the target AND the
    exact-60 option needs a fixed-timeline accumulator that alternates 2 and 3
    refreshes — averaging 60 with frame times swinging 13.9/20.8 ms. Even pacing
    wins for a scene someone walks around in; 144 -> 72 still removes half the work.
  */
  it('halves a 144 Hz display to an evenly paced 72, not an uneven 60', () => {
    render(<FrameLimiter fps={60} />);

    tick(144, 1000 / 144);

    expect(advance.mock.calls.length).toBeGreaterThanOrEqual(71);
    expect(advance.mock.calls.length).toBeLessThanOrEqual(72);
  });

  /*
    The unit bug, pinned.

    With frameloop="never" r3f derives the frame delta as
    `timestamp - state.clock.elapsedTime`, and `elapsedTime` is a three.js Clock
    value — SECONDS. Passing rAF's millisecond timestamp made every delta ~1000x
    too large: the HUD read 0 fps at a ~16,000 ms frame time, and every useFrame
    consumer in the scene (walking speed, remote-avatar interpolation, dance
    timing, the laser auto-clear) integrated against it.
  */
  it('advances in seconds, not milliseconds', () => {
    render(<FrameLimiter fps={60} />);

    tick(3, 1000 / 60);

    const stamps = advance.mock.calls.map(([t]) => t as number);
    // Three frames at 60 fps is ~0.033 s. In milliseconds it would be ~33.
    expect(stamps[stamps.length - 1]).toBeLessThan(1);
    for (let i = 1; i < stamps.length; i += 1) {
      expect(stamps[i] - stamps[i - 1]).toBeCloseTo(1 / 60, 3);
    }
  });

  it('starts the clock near zero so the first delta is not the page age', () => {
    // A session twenty seconds old: rAF timestamps are ~20000 ms by now.
    let t = 20_000;
    render(<FrameLimiter fps={60} />);
    for (let i = 0; i < 2; i++) {
      const cb = callbacks.shift();
      if (!cb) break;
      t += 1000 / 60;
      cb(t);
    }

    const [first] = advance.mock.calls[0];
    // Relative to the first frame, so r3f's clock does not see a 20-second jump.
    expect(first).toBe(0);
  });

  it('passes a monotonically increasing timestamp', () => {
    render(<FrameLimiter fps={60} />);

    tick(2, 1000 / 60);

    expect(advance).toHaveBeenCalledWith(expect.any(Number));
    // A non-increasing timestamp would produce zero or negative deltas.
    const [first] = advance.mock.calls[0];
    const [second] = advance.mock.calls[1];
    expect(second).toBeGreaterThan(first);
  });

  it('keeps the loop alive when advance throws', () => {
    advance.mockImplementation(() => {
      throw new Error('render blew up');
    });
    render(<FrameLimiter fps={60} />);

    // The next callback must already be queued before advance runs, or one bad
    // frame leaves a permanently frozen canvas — and with frameloop="never" that
    // is a black screen, not a stutter.
    expect(() => tick(1, 1000 / 60)).toThrow('render blew up');
    expect(callbacks.length).toBeGreaterThan(0);
  });

  it('does nothing when fps is zero or negative', () => {
    render(<FrameLimiter fps={0} />);
    expect(callbacks).toHaveLength(0);
    expect(advance).not.toHaveBeenCalled();
  });
});
