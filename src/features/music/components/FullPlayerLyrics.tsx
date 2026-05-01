'use client';

import type { SyncedLyricLine } from '../api';

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

interface FullPlayerLyricsProps {
  lyrics: SyncedLyricLine[];
  currentLineIndex: number;
  duration: number;
  seek: (percent: number) => void;
  lyricsRef: React.RefObject<HTMLDivElement | null>;
  variant: 'mobile' | 'desktop';
}

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
