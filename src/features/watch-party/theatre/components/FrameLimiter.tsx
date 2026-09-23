'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * Caps the render loop to a target frame rate.
 *
 * ## What this does and does not do
 *
 * `requestAnimationFrame` is already vsync-locked, so on a 60 Hz display the
 * scene was never rendering faster than 60 and this changes nothing there. What it
 * changes is high-refresh displays: a 120 Hz MacBook with ProMotion, or a 144 Hz
 * gaming monitor, was rendering 120-144 frames a second for a scene that looks
 * identical at 60. This is the rare optimisation that costs no quality at all —
 * it removes work rather than detail, because the frames it skips were never
 * distinguishable.
 *
 * The saving is close to proportional. `TheatreScene` notes the scene is
 * fragment-bound (~12,000 triangles lit by 16 point and area lights), so cost
 * scales with pixels shaded per frame; halving the frames roughly halves GPU load,
 * which on a laptop is the difference between the fans spinning up and not.
 *
 * ## Why a custom loop
 *
 * Throttling inside `useFrame` does not work: `useFrame` callbacks run before the
 * render, so skipping work in one still pays for the draw. The frame itself has to
 * be skipped, which means taking over the loop — `<Canvas frameloop="never">` plus
 * `advance(t)`, the approach react-three-fiber documents for exactly this.
 *
 * **This component is load-bearing.** With `frameloop="never"` nothing renders
 * unless `advance` is called, so if this fails to mount the scene is a black
 * canvas. It is deliberately trivial and mounted as the first child of the Canvas
 * for that reason.
 *
 * ## The off-by-one that makes this halve your frame rate
 *
 * The naive guard is `if (t - last < 1000 / fps) return`. At 60 fps that interval
 * is 16.667 ms, and rAF on a 60 Hz display fires at 16.6-16.7 ms with jitter — so
 * roughly half the callbacks come in a hair under the threshold, get skipped, and
 * the display settles at 30 fps. The tolerance below is what prevents that: a
 * frame is allowed if it is within `TOLERANCE_MS` of the target, so a 60 Hz
 * display renders every callback and a 120 Hz display renders every second one.
 *
 * ## `fps` is a target, and only display divisors are reachable
 *
 * Skipping whole callbacks means the achievable rates are the display's refresh
 * divided by an integer. 120 Hz gives exactly 60. **144 Hz gives 72**, because the
 * alternative is every third callback at 48, and 72 is both closer to the target
 * and evenly paced.
 *
 * That trade is deliberate. Hitting exactly 60 on a 144 Hz panel would need a
 * fixed-timeline accumulator, which renders after 2 refreshes then 3 then 2 —
 * averaging 60 but with frame times alternating 13.9/20.8 ms. For a scene someone
 * walks around in, even pacing reads as smoother than a correct average, and
 * uneven delivery is exactly what judder is. The saving is the point here, and
 * 144 -> 72 still removes half the work.
 *
 * @param fps - Target ceiling. Never raises the rate above the display's refresh,
 *   and lands on the nearest evenly-paced divisor of it rather than the exact
 *   number.
 */
export function FrameLimiter({ fps = 60 }: { fps?: number }) {
  const advance = useThree((state) => state.advance);

  useEffect(() => {
    if (fps <= 0) return;

    const interval = 1000 / fps;
    /*
      Half a frame at 120 Hz. Wide enough to absorb rAF jitter on a display whose
      refresh matches the target, narrow enough that a 120 Hz display still skips
      every other callback (8.33 ms is well under 16.67 - 4).
    */
    const TOLERANCE_MS = 4;

    let raf = 0;
    let last = performance.now() - interval;

    const loop = (t: number) => {
      // Queued first, so an exception in `advance` cannot kill the loop and leave
      // a permanently frozen canvas.
      raf = requestAnimationFrame(loop);
      if (t - last < interval - TOLERANCE_MS) return;
      last = t;
      // Drives the whole frame: every useFrame callback, then the render.
      advance(t);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [advance, fps]);

  return null;
}
