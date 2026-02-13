'use client';

import { Clock, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPlatformStats, type PlatformStats } from '@/features/auth/api';

// Hoisted styles to module level to prevent recreation on each render (rule 5.4)
const GRID_STYLE = {
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
  `,
  backgroundSize: '20px 20px',
} as const;

const PARTICLE_POSITIONS = [
  { left: '10%', top: '20%', animationDelay: '0s' },
  { left: '22%', top: '45%', animationDelay: '0.3s' },
  { left: '34%', top: '70%', animationDelay: '0.6s' },
  { left: '46%', top: '20%', animationDelay: '0.9s' },
  { left: '58%', top: '45%', animationDelay: '1.2s' },
  { left: '70%', top: '70%', animationDelay: '1.5s' },
  { left: '82%', top: '20%', animationDelay: '1.8s' },
  { left: '94%', top: '45%', animationDelay: '2.1s' },
] as const;

/**
 * Animated stats banner for login page
 * Shows platform-wide watch statistics with a cinematic aesthetic
 */
export function StatsBanner() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="relative w-full max-w-md mx-auto mb-6 h-24 rounded-2xl overflow-hidden bg-gradient-to-r from-zinc-900/80 via-zinc-800/50 to-zinc-900/80 border border-zinc-800/50 animate-pulse" />
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto mb-6 group">
      {/* Main Banner Container */}
      <div className="relative h-28 rounded-2xl overflow-hidden border border-zinc-800/50 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={GRID_STYLE} />
        </div>

        {/* Scanner Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-scan" />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLE_POSITIONS.map((pos) => (
            <div
              key={pos.left}
              className="absolute w-1 h-1 rounded-full bg-primary/40 animate-float"
              style={pos}
            />
          ))}
        </div>

        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />

        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-between px-6">
          {/* Left: Main Stat */}
          <div className="flex items-center gap-4">
            {/* Animated Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary fill-primary/30" />
              </div>
            </div>

            {/* Stats Text */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Content Streamed
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tracking-tight animate-glow">
                  {stats.totalWatchTimeFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Status */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Live stats</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Marquee */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-center overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-[10px] text-muted-foreground/40 font-mono">
            <span className="mx-4">★ STREAMING PLATFORM</span>
            <span className="mx-4">★ WATCH TOGETHER</span>
            <span className="mx-4">★ HD QUALITY</span>
            <span className="mx-4">★ SYNC IN REAL-TIME</span>
            <span className="mx-4">★ STREAMING PLATFORM</span>
            <span className="mx-4">★ WATCH TOGETHER</span>
            <span className="mx-4">★ HD QUALITY</span>
            <span className="mx-4">★ SYNC IN REAL-TIME</span>
          </div>
        </div>
      </div>
    </div>
  );
}
