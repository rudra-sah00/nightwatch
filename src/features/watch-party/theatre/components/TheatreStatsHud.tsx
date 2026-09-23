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
 */
export function StatsProbe({ stats }: { stats: React.RefObject<Stats> }) {
  const acc = useRef(0);
  const frames = useRef(0);

  useFrame((_, delta) => {
    const s = stats.current;
    if (!s) return;
    acc.current += delta;
    frames.current += 1;
    // Average over ~200 ms; a per-frame number is too noisy to read.
    if (acc.current >= 0.2) {
      s.fps = Math.round(frames.current / acc.current);
      s.frameMs = +((acc.current / frames.current) * 1000).toFixed(1);
      acc.current = 0;
      frames.current = 0;
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
 * **FPS only.** This used to also show PING, NET (newest-packet age and packet
 * rate), PEERS and SMOOTH (interpolation delay). All four were network
 * diagnostics, and reading five numbers to answer "is it running smoothly" is
 * worse than reading one. The underlying figures are still collected on the stats
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
  const [view, setView] = useState<{ fps: number; frameMs: number } | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;
    function sample() {
      const s = stats.current;
      if (!s) return;
      setView({ fps: s.fps, frameMs: s.frameMs });
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
        <span className={fpsColour}>
          {view.fps} <span className="text-white/30">/ {view.frameMs}ms</span>
        </span>
      </div>
    </div>
  );
}
