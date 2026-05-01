'use client';

import type { SyncedLyricLine } from '../api';

/**
 * Variant-based configuration map for lyrics styling.
 *
 * Each variant (`mobile` | `desktop`) defines font sizes, blur intensity,
 * spacing, top/bottom spacer heights, CSS mask gradients, and whether the
 * scale transform is applied to the active line. This allows a single
 * {@link FullPlayerLyrics} component to serve both mobile and desktop
 * full-player layouts without conditional branching in the render body.
 */
const config = {
  mobile: {
    fontSizeCurrent: '1.75rem',
    fontSizeOther: '1.25rem',
    blurMax: 2,
    spaceClass: 'space-y-5',
    topSpacer: 'h-[20vh]',
    bottomSpacer: 'h-[30vh]',
    mask: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
    scale: false,
  },
  desktop: {
    fontSizeCurrent: '2rem',
    fontSizeOther: '1.5rem',
    blurMax: 2.5,
    spaceClass: 'space-y-6',
    topSpacer: 'h-[30vh]',
    bottomSpacer: 'h-[30vh]',
    mask: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
    scale: true,
  },
} as const;

/**
 * Props for the {@link FullPlayerLyrics} component.
 */
interface FullPlayerLyricsProps {
  /** Array of time-stamped lyric lines. */
  lyrics: SyncedLyricLine[];
  /** Index of the currently active lyric line (-1 if none). */
  currentLineIndex: number;
  /** Total track duration in seconds, used to compute seek percentage on click. */
  duration: number;
  /** Callback to seek to a percentage (0–100) when a lyric line is clicked. */
  seek: (percent: number) => void;
  /** Ref attached to the scroll container; the parent orchestrator drives smooth scrolling. */
  lyricsRef: React.RefObject<HTMLDivElement | null>;
  /** Selects the styling variant from the {@link config} map. */
  variant: 'mobile' | 'desktop';
}

/**
 * Synced lyrics display used inside both {@link MobileFullPlayer} and {@link DesktopFullPlayer}.
 *
 * Renders a vertically scrollable list of lyric lines with karaoke-style highlighting:
 * - The **current** line is rendered at full opacity, larger font, and no blur.
 * - **Past** lines fade to 15 % white opacity.
 * - **Future** lines sit at 30 % white opacity.
 * - Lines further from the current index receive increasing Gaussian blur (capped by `blurMax`).
 *
 * Clicking any line seeks playback to that line's timestamp. Styling differences between
 * mobile and desktop (font sizes, spacing, mask gradients, scale transforms) are driven
 * entirely by the `variant` prop via the {@link config} lookup — no conditional branches.
 */
export function FullPlayerLyrics({
  lyrics,
  currentLineIndex,
  duration,
  seek,
  lyricsRef,
  variant,
}: FullPlayerLyricsProps) {
  const v = config[variant];

  return (
    <div
      ref={lyricsRef}
      className={`overflow-y-auto no-scrollbar ${variant === 'mobile' ? 'px-1 h-full' : 'px-4 max-h-full'} ${v.spaceClass}`}
      style={{
        maskImage: v.mask,
        WebkitMaskImage: v.mask,
      }}
    >
      <div className={v.topSpacer} />
      {lyrics.map((line, i) => {
        const isCurrent = i === currentLineIndex;
        const isPast = i < currentLineIndex;
        const dist = Math.abs(i - currentLineIndex);
        return (
          <p
            key={line.time}
            className="font-headline uppercase tracking-tight leading-snug cursor-pointer"
            style={{
              fontSize: isCurrent ? v.fontSizeCurrent : v.fontSizeOther,
              fontWeight: isCurrent ? 900 : 700,
              color: isCurrent
                ? '#fff'
                : isPast
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.3)',
              filter: isCurrent
                ? 'none'
                : `blur(${Math.min(dist * 0.5, v.blurMax)}px)`,
              transform: v.scale
                ? isCurrent
                  ? 'scale(1)'
                  : 'scale(0.92)'
                : undefined,
              transition: v.scale
                ? 'font-size 0.4s ease, color 0.4s ease, filter 0.5s ease, transform 0.4s ease'
                : 'all 0.4s ease',
            }}
            onClick={() => {
              if (duration > 0) seek((line.time / duration) * 100);
            }}
            onKeyDown={() => {}}
          >
            {line.text}
          </p>
        );
      })}
      <div className={v.bottomSpacer} />
    </div>
  );
}
