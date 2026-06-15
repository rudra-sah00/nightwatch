'use client';

import Image from 'next/image';
import type { DiscoverSong } from '../api';

interface DiscoverCardStackProps {
  nextSong?: DiscoverSong;
  thirdSong?: DiscoverSong;
  animating: boolean;
}

export function DiscoverCardStack({
  nextSong,
  thirdSong,
  animating,
}: DiscoverCardStackProps) {
  return (
    <>
      {/* Third card — furthest back, smallest */}
      {thirdSong && (
        <div
          className="absolute w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/30 transition-all duration-300"
          style={{
            transform: animating
              ? 'scale(0.92) translateY(-8px)'
              : 'scale(0.88) translateY(-14px)',
            opacity: animating ? 0.5 : 0.4,
            zIndex: 1,
          }}
        >
          <Image src={thirdSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Second card — middle */}
      {nextSong && (
        <div
          className="absolute w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/50 transition-all duration-300"
          style={{
            transform: animating
              ? 'scale(0.97) translateY(-3px)'
              : 'scale(0.93) translateY(-7px)',
            opacity: animating ? 0.8 : 0.6,
            zIndex: 2,
          }}
        >
          <Image src={nextSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
    </>
  );
}
