import { describe, expect, it } from 'vitest';
import {
  DANCE_CLEARANCE_M,
  hasDanceSpace,
  tightestClearance,
  WHEEL_DEAD_ZONE_PX,
  wheelOptionAngle,
  wheelSelection,
} from '@/features/watch-party/theatre/lib/dance-rules';

describe('hasDanceSpace', () => {
  const clear = Array.from({ length: 8 }, () => Number.POSITIVE_INFINITY);

  it('allows dancing in the open', () => {
    expect(hasDanceSpace(clear)).toBe(true);
  });

  it('refuses when any single direction is blocked', () => {
    const oneWall = [...clear];
    oneWall[3] = 0.2;
    expect(hasDanceSpace(oneWall)).toBe(false);
  });

  it('refuses when boxed in between seats', () => {
    // seat pitch is 0.90 m, so mid-row leaves under half that on each side
    expect(hasDanceSpace(Array.from({ length: 8 }, () => 0.44))).toBe(false);
  });

  it('accepts exactly the required clearance', () => {
    expect(
      hasDanceSpace(Array.from({ length: 8 }, () => DANCE_CLEARANCE_M)),
    ).toBe(true);
  });

  it('refuses a hair under the requirement', () => {
    expect(
      hasDanceSpace(Array.from({ length: 8 }, () => DANCE_CLEARANCE_M - 0.01)),
    ).toBe(false);
  });

  it('refuses when nothing was probed, rather than defaulting to yes', () => {
    // an unmeasured world must not silently permit dancing
    expect(hasDanceSpace([])).toBe(false);
  });
});

describe('tightestClearance', () => {
  it('reports the worst direction, which is what the user must fix', () => {
    expect(tightestClearance([2, 0.4, 1.5])).toBe(0.4);
  });

  it('is zero when nothing was measured', () => {
    expect(tightestClearance([])).toBe(0);
  });
});

describe('wheelSelection', () => {
  const N = 3;

  it('cancels inside the dead zone, so a stray tap does nothing', () => {
    expect(wheelSelection(0, 0, N)).toBeNull();
    expect(wheelSelection(WHEEL_DEAD_ZONE_PX - 1, 0, N)).toBeNull();
  });

  it('picks the first option straight up', () => {
    // screen Y grows downward, so "up" is negative dy
    expect(wheelSelection(0, -120, N)).toBe(0);
  });

  it('runs clockwise like every other radial menu', () => {
    // with 3 options: up=0, lower-right=1, lower-left=2
    expect(wheelSelection(110, 70, N)).toBe(1);
    expect(wheelSelection(-110, 70, N)).toBe(2);
  });

  it('centres each option on its direction rather than starting at it', () => {
    // a small wobble either side of straight up must stay on option 0
    expect(wheelSelection(-20, -120, N)).toBe(0);
    expect(wheelSelection(20, -120, N)).toBe(0);
  });

  it('is distance independent once out of the dead zone', () => {
    expect(wheelSelection(0, -60, N)).toBe(wheelSelection(0, -600, N));
  });

  it('always returns a valid index', () => {
    for (let deg = 0; deg < 360; deg += 7) {
      const r = (deg * Math.PI) / 180;
      const got = wheelSelection(Math.sin(r) * 100, -Math.cos(r) * 100, N);
      expect(got).not.toBeNull();
      expect(got).toBeGreaterThanOrEqual(0);
      expect(got).toBeLessThan(N);
    }
  });

  it('handles an empty option list without crashing', () => {
    expect(wheelSelection(0, -100, 0)).toBeNull();
  });

  it('agrees with the layout angles used to draw the labels', () => {
    for (let i = 0; i < N; i += 1) {
      const a = wheelOptionAngle(i, N);
      // draw position uses (sin a, -cos a); selection must round-trip to i
      expect(wheelSelection(Math.sin(a) * 100, -Math.cos(a) * 100, N)).toBe(i);
    }
  });
});
