'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { packetHealth, type TheatreStats as Stats } from '../lib/theatre-stats';

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
 * The readout itself. A DOM overlay, outside the Canvas.
 *
 * DOM rather than drei's `<Html>` or a 3D text mesh: this is instrumentation
 * about the scene, so it must not be affected by the scene's own camera, fog or
 * lighting, and it must stay legible when the render is struggling — which is
 * exactly when it is being read.
 *
 * There is intentionally no "ping" figure. See `theatre-stats.ts`: pose messages
 * carry the sender's wall clock, and browser clocks are not in sync, so any
 * latency computed from them would be skew, not delay. `NET` shows the age of the
 * newest packet, which is measured entirely on this machine's clock and is the
 * honest answer to "is this live".
 */
export function TheatreStatsHud({
  stats,
  visible = true,
}: {
  stats: React.RefObject<Stats>;
  visible?: boolean;
}) {
  const [view, setView] = useState<{
    fps: number;
    frameMs: number;
    ageMs: number | null;
    hz: number;
    peers: number;
    interpDelayMs: number;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    function sample() {
      const s = stats.current;
      if (!s) return;
      setView({
        fps: s.fps,
        frameMs: s.frameMs,
        // Age is derived here, against the current time, so it keeps climbing
        // when nothing is arriving instead of freezing at the last packet.
        ageMs:
          s.lastPacketAt === null
            ? null
            : Math.max(0, Date.now() - s.lastPacketAt),
        hz: s.packetHz,
        peers: s.peers,
        interpDelayMs: s.interpDelayMs,
      });
    }
    sample();
    const id = setInterval(sample, REFRESH_MS);
    return () => clearInterval(id);
  }, [stats, visible]);

  if (!visible || !view) return null;

  const health = packetHealth(view.ageMs);
  const netColour =
    health === 'good'
      ? 'text-emerald-400'
      : health === 'late'
        ? 'text-amber-400'
        : health === 'stalled'
          ? 'text-red-400'
          : 'text-white/40';
  const fpsColour =
    view.fps >= 50
      ? 'text-emerald-400'
      : view.fps >= 30
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-50 rounded-md bg-black/70 px-2.5 py-2 font-mono text-[10px] leading-relaxed tabular-nums text-white/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/40">FPS</span>
        <span className={fpsColour}>
          {view.fps} <span className="text-white/30">/ {view.frameMs}ms</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/40">NET</span>
        <span className={netColour}>
          {view.ageMs === null ? '—' : `${view.ageMs}ms`}
          <span className="text-white/30"> / {view.hz}Hz</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/40">PEERS</span>
        <span className="text-white/60">{view.peers}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/40">SMOOTH</span>
        <span className="text-white/60">{view.interpDelayMs}ms</span>
      </div>
    </div>
  );
}
