'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TvHubTileProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind background class for the icon plate. */
  accent: string;
  /** Called before navigation, so the gate can record that the choice was made. */
  onPick?: () => void;
  /**
   * Lets the grid point a well-known key at the first tile — `FOCUS_KEYS.CONTENT` on
   * the home page, or the gate's own entry key. Nothing else in the app registers
   * `FOCUS_KEYS.CONTENT`, which left `useTvFocus`'s default-focus path a silent no-op:
   * it guards on `doesFocusableExist` and so never fired.
   */
  focusKey?: string;
}

/**
 * A focusable entry-hub tile for Android TV.
 *
 * Follows the `TvCard` convention: a plain element driven by the spatial navigation
 * manager plus the shared `tv-focusable` classes, rather than a native button that
 * would compete with the manager for focus.
 *
 * Every tile is focusable, which also guarantees the home screen has a D-pad target.
 * Once Continue Watching was empty there was previously nothing focusable here and
 * pressing Right from the sidebar did nothing.
 */
export function TvHubTile({
  href,
  label,
  icon: Icon,
  accent,
  onPick,
  focusKey,
}: TvHubTileProps) {
  const router = useRouter();
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => {
      onPick?.();
      router.push(href);
    },
    onFocus: () => router.prefetch(href),
  });

  return (
    <div
      ref={ref}
      className={`tv-focusable flex flex-col items-center justify-center gap-5 p-8 border-4 bg-card ${
        focused ? 'tv-focusable--focused border-neo-blue' : 'border-border'
      }`}
    >
      <span
        className={`flex items-center justify-center w-24 h-24 border-4 border-border ${accent}`}
      >
        <Icon className="w-12 h-12 text-foreground" aria-hidden="true" />
      </span>
      <p className="font-headline font-black uppercase tracking-widest text-xl text-foreground text-center">
        {label}
      </p>
    </div>
  );
}
