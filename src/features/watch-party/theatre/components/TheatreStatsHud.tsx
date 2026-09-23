'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { TheatreStats as Stats } from '../lib/theatre-stats';

/** How often the DOM readout refreshes. 5 Hz is readable without flickering. */
const REFRESH_MS = 200;

/**
 * Samples frame cost. Must live INSIDE the Canvas to get the r3f frame loop.
 *
 * Writes into the shared stats object rather than React state: a setState per
 * frame would re-render the scene sixty times a second to display a number about
 * how fast the scene renders.
 *
 * Timed from `performance.now()` rather than from the `delta` r3f hands `useFrame`.
 * That is deliberate independence: `delta` is derived from whatever timestamp
 * drives the loop, so when `FrameLimiter` passed milliseconds where r3f wanted
 * seconds, every delta came out ~1000x too large and this readout reported 0 fps
 * at a ~16,000 ms frame time — it agreed with the bug instead of exposing it. A
 * wall clock cannot be wrong about how much real time passed, so the readout is
 * now a check on the loop rather than a mirror of it.
 */
export function StatsProbe({ stats }: { stats: React.RefObject<Stats> }) {
  const frames = useRef(0);
  const windowStart = useRef<number | null>(null);

  useFrame(() => {
    const s = stats.current;
    if (!s) return;

    const now = performance.now();
    if (windowStart.current === null) {
      windowStart.current = now;
      return;
    }

    frames.current += 1;
    const elapsedMs = now - windowStart.current;

    // Average over ~200 ms; a per-frame number is too noisy to read.
    if (elapsedMs >= 200) {
      s.fps = Math.round((frames.current * 1000) / elapsedMs);
      s.frameMs = +(elapsedMs / frames.current).toFixed(1);
      frames.current = 0;
      windowStart.current = now;
    }
  });

  return null;
}

/**
 * Frame-rate readout. A DOM overlay, outside the Canvas.
 *
 * DOM rather than drei's `<Html>` or a 3D text mesh: this is instrumentation
 * about the scene, so it must not be affected by the scene's own camera, fog or
 * lighting, and it must stay legible when the render is struggling — which is
 * exactly when it is being read.
 *
 * **FPS only, and no frame-time figure either.** This used to show PING, NET
 * (newest-packet age and packet rate), PEERS and SMOOTH (interpolation delay), and
 * a `/ 16.7ms` alongside the FPS. The four network figures were diagnostics, and
 * frame time is the reciprocal of FPS — it says the same thing twice. The underlying figures are still collected on the stats
 * object by `use-theatre-network`, so anything that wants them can read them —
 * nothing currently does, which means the AVATAR_PING / AVATAR_PONG round trip
 * now has no consumer and is a candidate for removal on bandwidth grounds.
 */
export function TheatreStatsHud({
  stats,
  visible = true,
}: {
  stats: React.RefObject<Stats>;
  visible?: boolean;
}) {
  const [view, setView] = useState<{ fps: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    function sample() {
      const s = stats.current;
      if (!s) return;
      // FPS only. `frameMs` is still measured onto the stats object for anything
      // that wants it, but two numbers saying the same thing is one too many.
      setView({ fps: s.fps });
    }
    sample();
    const id = setInterval(sample, REFRESH_MS);
    return () => clearInterval(id);
  }, [stats, visible]);

  if (!visible || !view) return null;

  // 50+ reads as smooth, 30-49 as playable, below 30 as a problem.
  const fpsColour =
    view.fps >= 50
      ? 'text-emerald-400'
      : view.fps >= 30
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-50 rounded-md bg-black/70 px-2.5 py-2 font-mono text-[10px] leading-relaxed tabular-nums text-white/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/40">FPS</span>
        <span className={fpsColour}>{view.fps}</span>
      </div>
    </div>
  );
}
